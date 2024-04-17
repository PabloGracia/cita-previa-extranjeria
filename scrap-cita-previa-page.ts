import puppeteer, { Browser, Page } from "puppeteer";

import { OnFailure } from "./types";

const takeScreenshot = async (page: Page): Promise<Buffer> => {
  return await page.screenshot({
    fullPage: true,
    type: "png",
    quality: 100,
  });
};

const closeBrowser = async (browser: Browser, onFailure: OnFailure) => {
  try {
    await browser.close();
  } catch (error) {
    onFailure("Error closing browser", {});
  }
};

function delay(time: number) {
  return new Promise(function (resolve) {
    setTimeout(resolve, time);
  });
}

export const scrapeAdminPage = async (
  onFailure: OnFailure,
  onSuccess: (message: string) => void,
  onMaintenance?: (message: string) => void
) => {
  console.log("Running scrapeAdminPage");
  // Launch the browser and open a new blank page
  let browser: Browser;
  try {
    browser = await puppeteer.launch({
      product: "chrome",
      executablePath: "/opt/homebrew/bin/chromium",
      headless: false,
    });
  } catch (error) {
    onFailure("Error launching browser", {});
    return;
  }

  // Create a new page
  let page: Page;
  try {
    page = await browser.newPage();
  } catch (error) {
    onFailure("Error creating new page", {});
    await closeBrowser(browser, onFailure);
    return;
  }

  const scrollIntoView = async (targetSelector: string) => {
    await page.evaluate((selector) => {
      const element = document.querySelector(selector);
      if (element) {
        element.scrollIntoView();
      }
    }, targetSelector);
  };

  // Pass the User-Agent Test.
  const userAgent =
    "Mozilla/5.0 (X11; Linux x86_64)" +
    " AppleWebKit/537.36 (KHTML, like Gecko) Chrome/64.0.3282.39 Safari/537.36";
  await page.setUserAgent(userAgent);

  // Pass the Webdriver Test.
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, "webdriver", {
      get: () => false,
    });
  });

  // Pass the Chrome Test.
  await page.evaluateOnNewDocument(() => {
    // We can mock this in as much depth as we need for the test.
    window.navigator.chrome = {
      runtime: {},
      // etc.
    };
  });

  // Pass the Plugins Length Test.
  await page.evaluateOnNewDocument(() => {
    // Overwrite the `plugins` property to use a custom getter.
    Object.defineProperty(navigator, "plugins", {
      // This just needs to have `length > 0` for the current test,
      // but we could mock the plugins too if necessary.
      get: () => [1, 2, 3, 4, 5],
    });
  });

  // Pass the Languages Test.
  await page.evaluateOnNewDocument(() => {
    // Overwrite the `plugins` property to use a custom getter.
    Object.defineProperty(navigator, "languages", {
      get: () => ["en-US", "en"],
    });
  });

  await page.setViewport({ width: 1920, height: 1080 });

  // Navigate the page to a URL
  try {
    await page.goto(
      "https://sede.administracionespublicas.gob.es/pagina/index/directorio/icpplus"
    );
  } catch (error) {
    const screenshotBuffer = await takeScreenshot(page);
    onFailure("Error navigating to URL", { screenshotBuffer });
    await closeBrowser(browser, onFailure);
    return;
  }

  try {
    // Wait for the button with the text "Acceder al Procedimiento" to be available
    const buttonSelector =
      'input[type="submit"][value="Acceder al Procedimiento"]';
    const buttonfound = await page.waitForSelector(buttonSelector);

    // Click the button

    await Promise.all([
      page.click(buttonSelector),
      page.waitForNavigation({ waitUntil: "networkidle2" }),
    ]);
  } catch (error) {
    const screenshotBuffer = await takeScreenshot(page);
    const message = "Error clicking on button to access procedure";
    onFailure(message, { screenshotBuffer });
    await closeBrowser(browser, onFailure);
    return;
  }

  // Select the province and click the accept button
  try {
    await page.waitForSelector("#form");
    await page.select("#form", "/icpplus/citar?p=46&locale=es");

    const acceptProvinceButtonSelector =
      'input[type="button"][value="Aceptar"]';

    await Promise.all([
      page.click(acceptProvinceButtonSelector),
      page.waitForNavigation({ waitUntil: "networkidle0" }),
    ]);
  } catch (error) {
    const screenshotBuffer = await takeScreenshot(page);
    const message = "Error selecting province and clicking accept button";
    onFailure(message, { screenshotBuffer });
    await closeBrowser(browser, onFailure);
    return;
  }

  // Select the relevant office and the procedure
  try {
    await page.waitForSelector("#portadaForm", { visible: true });

    await page.waitForSelector("#sede", { visible: true });
    await page.select("#sede", "8");
    await page.waitForNavigation({ waitUntil: "networkidle0", timeout: 2000 });

    await page.waitForSelector("#tramiteGrupo\\[0\\]", { visible: true });
    await page.select("#tramiteGrupo\\[0\\]", "4036");

    const acceptOfficeButtonSelector = 'input[type="button"][value="Aceptar"]';

    const importantNoticeElement = await page.$(".mf-note");

    if (importantNoticeElement) {
      const noticeText = await page.evaluate(
        (element) => element.textContent,
        importantNoticeElement
      );

      // Check if the specific string is present in the notice text
      if (
        noticeText.includes(
          "En este momento no hay citas disponibles en esta sede."
        )
      ) {
        //The specific notice about unavailability of appointments is present on the page.

        onMaintenance &&
          onMaintenance(
            "The specific notice about unavailability of appointments is present on the page."
          );

        // Perform actions if the specific string is found
      } else {
        onSuccess("The specific notice is not found within the element.");
      }
    } else {
      onSuccess("The important notice element is not found on the page.");
    }

    await Promise.all([
      page.click(acceptOfficeButtonSelector),
      page.waitForNavigation({ waitUntil: "networkidle0" }),
    ]);
  } catch (error) {
    const screenshotBuffer = await takeScreenshot(page);
    const message = "Error selecting office and procedure";
    onFailure(message, { screenshotBuffer });
    await closeBrowser(browser, onFailure);
    return;
  }

  // Skip the information page
  try {
    const skipButtonSelector = 'input[type="button"][value="Entrar"]';
    await Promise.all([
      page.click(skipButtonSelector),
      page.waitForNavigation({ waitUntil: "networkidle2" }),
    ]);
  } catch (error) {
    const screenshotBuffer = await takeScreenshot(page);
    const message = "Error clicking on button to skip information page";
    onFailure(message, { screenshotBuffer });
    await closeBrowser(browser, onFailure);
    return;
  }

  // Fill in the personal details
  try {
    const NIE = process.env["PERSONAL_DETAILS_NIE"];
    const email = process.env["PERSONAL_DETAILS_EMAIL"];
    const name = process.env["PERSONAL_DETAILS_NAME"];

    if (!NIE || !email || !name) {
      throw new Error("Missing environment variables");
    }

    await page.waitForSelector("#txtIdCitado");
    await page.type("#txtIdCitado", NIE, { delay: 100 });
    await delay(1500);
    await page.type("#txtDesCitado", name, { delay: 100 });
    const aceptarSelector = 'input[type="button"][value="Aceptar"]';
    await page.waitForSelector(aceptarSelector, { visible: true });

    await scrollIntoView(aceptarSelector);
    await delay(3000);

    await page.click(aceptarSelector);
    page.on("console", (msg) => console.log("PAGE LOG:", msg.text()));
  } catch (error) {
    const screenshotBuffer = await takeScreenshot(page);
    const message = "Error filling in personal details";
    onFailure(message, { screenshotBuffer });
    await closeBrowser(browser, onFailure);
    return;
  }

  // Select the option to apply for a new appointment
  try {
    const solicitarCitaSelector =
      'input[type="button"][value="Solicitar Cita"]';
    console.log("test message");
    await page.waitForSelector(solicitarCitaSelector, { visible: true });
    console.log('Found the "Solicitar Cita" button');
    await page.click(solicitarCitaSelector);

    await page.waitForNavigation({ waitUntil: "networkidle0" });
  } catch (error) {
    const screenshotBuffer = await takeScreenshot(page);
    const message = "Error selecting option for new appointment";
    onFailure(message, { screenshotBuffer });
    await closeBrowser(browser, onFailure);
    return;
  }

  // Take the step 2 out of 5: Fill in complementary information
  await fillInComplementaryInformation(page, onFailure);

  // Take the step 3 out of 5: Select the first available date
  await selectFirstAvailableDate(page, onFailure);

  // Take the step 4 out of 5: Figure out what to do
  await figureOutStep4(page, onFailure);

  setTimeout(async () => {
    await closeBrowser(browser, onFailure);
  }, 3000);
};

const fillInComplementaryInformation = async (
  page: Page,
  onFailure: OnFailure
) => {
  // Step 2 out of 5
  try {
    const phoneNumber = process.env["PERSONAL_DETAILS_PHONE_NUMBER"];
    const email = process.env["PERSONAL_DETAILS_EMAIL"];
    if (!phoneNumber || !email) {
      throw new Error("Missing environment variable: phone number or email");
    }
    await delay(1200);
    await page.waitForSelector("#txtTelefonoCitado", { visible: true });
    await page.type("#txtTelefonoCitado", phoneNumber, { delay: 65 });

    await delay(400);
    await page.waitForSelector("##emailUNO", { visible: true });
    await page.type("#emailUNO", email, { delay: 80 });

    await delay(570);
    await page.waitForSelector("#emailDOS", { visible: true });
    await page.type("#emailDOS", email, { delay: 70 });

    await delay(813);
    await page.waitForSelector("#btnSiguiente", { visible: true });
    await page.click("#btnSiguiente");
    await page.waitForNavigation({ waitUntil: "networkidle0" });
  } catch (error) {
    const screenshotBuffer = await takeScreenshot(page);
    const message = "Error filling in complementary information";
    onFailure(message, { screenshotBuffer });
    return;
  }
};

const selectFirstAvailableDate = async (page: Page, onFailure: OnFailure) => {
  // Step 3 out of 5
  try {
    await delay(1100);
    await page.waitForSelector('input[name="rdbCita"]', { visible: true });
    await page.click("#cita1");

    await delay(597);
    await page.waitForSelector("#btnSiguiente", { visible: true });
    await page.click("#btnSiguiente");

    // Wait for the confirmation dialog to appear
    await delay(317);
    await page.waitForSelector(".jconfirm-box", { visible: true });
    const yesButtonSelector = ".jconfirm-box button";
    await page.waitForSelector(yesButtonSelector);
    await page.evaluate((yesButtonSelector) => {
      // Get all buttons
      const buttons = Array.from(document.querySelectorAll(yesButtonSelector));
      // Find the 'Yes' button and click it
      const yesButton = buttons.find(
        (button) => button.textContent.toLowerCase() === "si"
      );
      if (yesButton) {
        yesButton.click();
      }
    }, yesButtonSelector);
  } catch (error) {
    const screenshotBuffer = await takeScreenshot(page);
    const message = "Error selecting first available date";
    onFailure(message, { screenshotBuffer });
    return;
  }
};

const figureOutStep4 = async (page: Page, onFailure: OnFailure) => {
  const screenshotBuffer = await takeScreenshot(page);

  // Collect details of interactive elements on the page.
  const formElementsData = await page.evaluate(() => {
    const formElements = [
      ...document.querySelectorAll("input, button, select, textarea, a"),
    ];
    return formElements.map((el) => {
      return {
        tagName: el.tagName,
        id: el.id,
        class: el.className,
        name: el.getAttribute("name"),
        value: el.value,
        href: el.href || null, // Only for anchor tags
        innerText: el.innerText.trim(),
        // Add other attributes you're interested in here...
      };
    });
  });

  // Serialize the data into a JSON string
  const serializedData = JSON.stringify(formElementsData, null, 2); // Pretty print with 2 spaces

  onFailure(serializedData, { screenshotBuffer });
};
