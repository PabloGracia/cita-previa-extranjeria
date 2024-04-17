import { scrapeAdminPage } from "./scrap-cita-previa-page";
import { onFailure, onMaintenance, onSuccess } from "./send-email";

const logUpAndRunning = () => {
  const date = new Date();
  console.log(`${date.toISOString()}: Server is up and running`);
};

const checkForAppointments = async () => {
  // create a random integet between 1 and 10
  console.log("Running checkForAppointments");
  const randomInt = Math.floor(Math.random() * 10) + 1;

  //const TIME_TO_WAIT = randomInt * 1000 * 60;
  const TIME_TO_WAIT = 1;

  setTimeout(async () => {
    await scrapeAdminPage(onFailure, onSuccess);
  }, TIME_TO_WAIT);
};

const checkSystemsInOrder = async () => {
  const date = new Date();
  console.log(`${date.toISOString()}: Running checkSystemsInOrder`);
  await scrapeAdminPage(onFailure, onSuccess, onMaintenance);
};

const EVERY_5MINUTES = 5 * 60 * 1000;
const EVERY_6_HOURS = 6 * 60 * 60 * 1000;
const EVERY_1_MINUTES = 1 * 60 * 1000;

/*
setInterval(checkForAppointments, EVERY_5MINUTES);
setInterval(checkSystemsInOrder, EVERY_6_HOURS);
setInterval(logUpAndRunning, EVERY_1_MINUTES);
*/

await checkForAppointments();
