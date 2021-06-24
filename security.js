const CryptoJS = require("crypto-js");
const Config = require("./config");

const encryptWithAES = (text) => {
    const passphrase = Config.secret;
    return CryptoJS.AES.encrypt(text, passphrase).toString();
  };

const decryptWithAES = function(ciphertext) {
    const passphrase = Config.secret;
    const bytes = CryptoJS.AES.decrypt(ciphertext, passphrase);
    const originalText = bytes.toString(CryptoJS.enc.Utf8);
    return originalText;
};

module.exports = {
    encryptWithAES: encryptWithAES,
    decryptWithAES: decryptWithAES
}