import { useEffect, useRef, useState } from "react";
import "./Opt.css";
import toast, { Toaster } from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import useSignUp from "../../store/useSignUp";
import useUser from "../../store/useUser";

export default function Otp({}) {
  const confirmationResult = useSignUp((state) => state.confirmationResult);
  const setCurrentUser = useUser((state) => state.setCurrentUser);

  const phone = useSignUp((state) => state.phone);

  const firstInput = useRef(null);
  const [otp, setOtp] = useState(new Array(6).fill(""));
  const [isOtpVerifie, setIsotpVerifie] = useState(false);

  const navigate = useNavigate();

  const handleOtpChange = (element, index) => {
    // If the entered value is not a number, don't update the state
    if (isNaN(element.value)) return false;
    // Update the state with the new entered value
    setOtp([...otp.map((d, idx) => (idx === index ? element.value : d))]);
    // If the last input is filled, blur and disable the input
    if (index === otp.length - 1) {
      element.blur();
      setIsotpVerifie(true);
      return;
    }
    // Otherwise focus the next input
    if (element.nextSibling) {
      element.nextSibling.focus();
    }
  };

  // clear OTP
  const clearOtp = () => {
    setOtp(new Array(6).fill(""));
    setIsotpVerifie(false);
  };

  //

  const handelSubmit = (e) => {
    e.preventDefault();
    confirmationResult
      .confirm(otp.join(""))
      .then((result) => {
        setCurrentUser(result.user);
        toast.success("تمت المصادقة");
        setTimeout(() => {
          navigate("/user");
        }, 2000);
      })
      .catch((error) => {
        toast.error("رمز تأكيد ليس صحيح!");
        console.error(error);
      });
  };

  // focus the first input when the component is mounted
  useEffect(() => {
    firstInput.current.focus();
  }, [isOtpVerifie]);
  // submit otp
  useEffect(() => {
    if (confirmationResult) {
      toast.success(`تم إرسال رمز التحقق إلى الرقم ${phone}`);
    }
  }, []);

  return (
    <div className="signup--container">
      <div className="otp">
        <h1>التحقق من رقمك</h1>
        <p className="d-f">
          <span>+222 37928327</span>
          تم إرسال رمز التحقق إلى الرقم
        </p>
        <form onSubmit={handelSubmit}>
          <div className="otp-inputs">
            {otp.map((data, index) => {
              return (
                <input
                  ref={index === 0 ? firstInput : null}
                  type="text"
                  key={index}
                  value={data}
                  onChange={(e) => handleOtpChange(e.target, index)}
                  disabled={isOtpVerifie}
                  onFocus={(e) => e.target.select()}
                />
              );
            })}
          </div>
          {/* didnt get otp */}
          <p className="resend-otp">
            لم تصلك رسالة؟ <a href="">إعادة الإرسال</a>
          </p>
          <div className="btns">
            <button className="btn otp-confiramtion" disabled={!isOtpVerifie}>
              تأكيد
            </button>
            <button
              className="btn otp-clear"
              onClick={clearOtp}
              disabled={!isOtpVerifie}
            >
              مسح
            </button>
          </div>
        </form>
        <Toaster />
      </div>
    </div>
  );
}
