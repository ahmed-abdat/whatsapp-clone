import { useState } from "react";
import PhoneInput from 'react-phone-number-input'
import 'react-phone-number-input/style.css'
import ar from 'react-phone-number-input/locale/ar.json'
import { auth } from "../../config/firebase";
import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";
import toast, { Toaster } from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import useSignUp from "../../store/useSignUp";
import "./SignUp.css";

export default function SignUp() {
  const [phone, setPhone] = useState("");
  const [isLoading, setIsLoding] = useState(false);

  const navigate = useNavigate();

  const setconfirmationResult = useSignUp((state) => state.setconfirmationResult);

  // recapter form
  const requestRecaptcha = () => {
    window.recaptchaVerifier = new RecaptchaVerifier(
      "sign-in-recaptcha",
      {
        size: "invisible",
        callback: (response) => {
          // reCAPTCHA solved, allow signInWithPhoneNumber.
          sendOtp();
          console.log(response);
        },
        "expired-callback": () => {
          // Response expired. Ask user to solve reCAPTCHA again.
          toast.error("حاول مرة أخرى");
        },
      },
      auth
    );
  };
  // send otp to phone number
  const sendOtp = () => {
    console.log("send otp");

  
    const appVerifier = window.recaptchaVerifier;
    signInWithPhoneNumber(auth, phone, appVerifier)
      .then((confirmationResult) => {
        window.confirmationResult = confirmationResult;
        setconfirmationResult(confirmationResult);
        navigate('/otp')
        toast.success(`تم إرسال رمز التحقق إلى الرقم +${phone}`);
        setIsLoding(false);
      })
      .catch((error) => {
        setIsLoding(false);
        toast.error("حدث خطأ أثناء إرسال الرسالة");
        console.error(error);
      });
  };


  // handel submit form
  const handelSumbit = (e) => {
    e.preventDefault();
    if (phone.length >= 11) {
      setIsLoding(true);
      requestRecaptcha();
      sendOtp();
    }
  };

  // sign up with google
  const signInWithGoogle = () => {
    const provider = new GoogleAuthProvider();
    signInWithPopup(auth, provider)
      .then((result) => {
        const user = result.user;
        console.log(user);
        toast.success("تم تسجيل الدخول بنجاح");
        navigate("/");
      })
      .catch((error) => {
        toast.error("حدث خطأ أثناء تسجيل الدخول");
        // Handle Errors here.
        const errorCode = error.code;
        const errorMessage = error.message;
        console.log(errorMessage);
      });
  };

  return (
    <div className="signup--container">
      <div className="info">
        <h3>أدخل رقم هاتفك</h3>
        <p>سيحتاج واتساب إلى التحقق من رقم هاتفك.</p>
      </div>
      <form className="signup-form" onSubmit={handelSumbit}>
        <PhoneInput className={`phoneInput`}
        value={phone}
        onChange={setPhone}
        placeholder="رقم هاتفك هنا ..."
        defaultCountry="MR"
        international
        limitMaxLength
        // countries={[
        //   "MR",
        //   "MA",
        //   "TN",
        //   "DZ",
        //   "LY",
        //   "EG",
        //   "SD",
        //   'SA',
        // ]}
        labels={ar}
        />
        <button type="submit" className="btn" disabled={isLoading}>
          التالي
        </button>
      </form>
      <div id="sign-in-recaptcha"></div>
      {/* signup from google */}
      <div className="signup-google" onClick={signInWithGoogle}>
        <img
          className="google-icon"
          src="https://img.icons8.com/color/24/000000/google-logo.png"
        />
        <p className="btn google-btn"> Sign In with Google</p>
      </div>
      <Toaster />
    </div>
  );
}