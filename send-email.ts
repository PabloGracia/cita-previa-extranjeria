import { Resend } from "resend";
import { OnFailure } from "./types";

const resend = new Resend(process.env["RESEND_KEY"]);
const RECEIVER_EMAIL = process.env["RESEND_RECEIVER_EMAIL"];
const SENDER_EMAIL = "onboarding@resend.dev";

export const onSuccess = (message: string) => {
  if (!resend || !RECEIVER_EMAIL || !SENDER_EMAIL) {
    throw new Error("Missing environment variables");
  }

  const fullMessage = `Hey! It seems there might be an appointment available. Please check the website. Additional message: ${message}`;

  resend.emails.send({
    from: SENDER_EMAIL,
    to: RECEIVER_EMAIL,
    subject: "URGENT! Appointment available!",
    html: `<div><p>${fullMessage}</p></div>`,
  });
};

export const onFailure: OnFailure = (message, { screenshotBuffer }) => {
  if (!resend || !RECEIVER_EMAIL || !SENDER_EMAIL) {
    throw new Error("Missing environment variables");
  }

  const fullMessage = `Something has wrong with the script. Additional message: ${message}`;

  resend.emails.send({
    from: SENDER_EMAIL,
    to: RECEIVER_EMAIL,
    subject: "The script failed",
    html: `<div><p>${fullMessage}</p></div>`,
    attachments: [
      {
        filename: "image.jpg",
        content: screenshotBuffer, // Your image file buffer here
      },
    ],
  });
};

export const onMaintenance = (message: string) => {
  if (!resend || !RECEIVER_EMAIL || !SENDER_EMAIL) {
    throw new Error("Missing environment variables");
  }

  const fullMessage = `It all seems to be working as it should. Additional message: ${message}`;

  resend.emails.send({
    from: SENDER_EMAIL,
    to: RECEIVER_EMAIL,
    subject: "Maintenance message",
    html: `<div><p>${fullMessage}</p></div>`,
  });
};
