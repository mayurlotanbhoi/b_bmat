// constants/regexPatterns.js
const mobileRegex = /^[6-9]\d{9}$/;
const pinCodeRegex = /^[1-9][0-9]{5}$/;
const nameRegex = /^[\p{Script=Devanagari}A-Za-z\s]+$/u;
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export {
    mobileRegex,
    pinCodeRegex,
    nameRegex,
    emailRegex,
};
