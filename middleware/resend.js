const {Resend} = require('resend');

const resendMail = async ({to, subject,text,html}) => {
    try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const response = await resend.emails.send({
      from: 'contact@resend.dev',
      to,
      subject,
      text,
      html
    });
     console.log('Email sent:', response.data.id);
  } catch (error) {
    console.error('Email sending error:', error);
  }
}

module.exports = resendMail;