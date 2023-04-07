import { useState } from "react";
import PhoneInput from "react-phone-number-input";
import "react-phone-number-input/style.css";
import ar from "react-phone-number-input/locale/ar.json";
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
import useUser from "../../store/useUser";
import "./SignUp.css";

export default function SignUp() {
  const [phone, setPhone] = useState("");
  const [isLoading, setIsLoding] = useState(false);

  const navigate = useNavigate();

  const setPhones = useSignUp((state) => state.setPhones);

  const setCurrentUser = useUser((state) => state.setCurrentUser);

  const setconfirmationResult = useSignUp(
    (state) => state.setconfirmationResult
  );

  // recapter form
  const requestRecaptcha = () => {
    // window.recaptchaVerifier = new RecaptchaVerifier('recaptcha-container', {}, auth);
    window.recaptchaVerifier = new RecaptchaVerifier(
      "sign-in-recaptcha",
      {
        size: "normal",
        callback: (response) => {
          // reCAPTCHA solved, allow signInWithPhoneNumber.
          sendOtp();
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
    console.log("send otp ");
    const appVerifier = window.recaptchaVerifier;
    signInWithPhoneNumber(auth, phone, appVerifier)
      .then((confirmationResult) => {
        window.confirmationResult = confirmationResult;
        setconfirmationResult(confirmationResult);
        setPhones(phone);
        console.log('message sent');
          setIsLoding(false);
          navigate("/otp");
      })
      .catch((error) => {
        setIsLoding(false);
        // toast.error("حدث خطأ أثناء إرسال الرسالة");
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
        setCurrentUser(user);
        toast.success("تم تسجيل الدخول بنجاح");
        setTimeout(() => {
          navigate("/user");
        }, 1000);
      })
      .catch((error) => {
        toast.error("حدث خطأ أثناء تسجيل الدخول");
        // Handle Errors here.
        const errorCode = error.code;
        console.error(error);
        const errorMessage = error.message;
        console.error(errorMessage);
      });
  };

  // save the user in firestore

  return (
    <div className="signup--container">
      <div className="info">
        <h3>أدخل رقم هاتفك</h3>
        <p>سيحتاج واتساب إلى التحقق من رقم هاتفك.</p>
      </div>
      <form className="signup-form" onSubmit={handelSumbit}>
        <PhoneInput
          className={`phoneInput`}
          value={phone}
          onChange={setPhone}
          placeholder="رقم هاتفك هنا ..."
          defaultCountry="MR"
          international
          limitMaxLength
          countries={["MR", "MA", "TN", "DZ", "LY", "EG", "SD", "SA"]}
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
