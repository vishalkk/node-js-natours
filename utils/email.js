const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
  console.log('Sending email to:', options.email);
  //1. create reusable transporter object using the default SMTP transport
  // create reusable transporter object using the default SMTP transport
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    auth: {
      user: process.env.EMAIL_USERNAME,
      pass: process.env.EMAIL_PASSWORD
    }
  });
  console.log('transporter', transporter);
  //2. define email options
  const mailOptions = {
    from: 'Vishal Kajale <<vishal@gmail.com>>',
    to: options.email,
    subject: options.subject,
    text: options.text
  };
  console.log('mailOptions', mailOptions);
  //3. send email

  await transporter.sendMail(mailOptions);
};
module.exports = sendEmail;
