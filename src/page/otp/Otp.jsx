import { useEffect, useRef, useState } from "react";
import "./Opt.css";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { Link, useNavigate } from "react-router-dom";
import useSignUp from "../../store/useSignUp";
import useUser from "../../store/useUser";
import { doc, getDoc, setDoc , getFirestore } from "firebase/firestore/lite";
import { app } from "../../config/firebase";

export default function Otp({}) {
  const confirmationResult = useSignUp((state) => state.confirmationResult);
  const setCurrentUser = useUser((state) => state.setCurrentUser);

  const getPhone = useSignUp((state) => state.getPhone);

  const [otp, setOtp] = useState(new Array(6).fill(""));
  const [isOtpVerifie, setIsotpVerifie] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const navigate = useNavigate();

  // set phoneUserVerified
  const setIsPhoneUserVerified = useUser(
    (state) => state.setIsPhoneUserVerified
  );

  // first input ref
  const firstInputRef = useRef(null);

  const handleOtpChange = (element, index) => {
    // If the entered value is not a number, don't update the state
    if (isNaN(element.value) || element.value === "") return false;
    // always start from the first input
    if (index !== 0 && otp[index - 1] === "") {
      // blur the current input and focus to the first input
      element.blur();
      firstInputRef.current.focus();
      return;
    }
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

  // handel delte input value
  const handelDeleteInput = (e, index) => {
    // if the user click backspace or delete key and the input is empty then focus to the previous input and clear it
    if (e.key === "Backspace" && otp[index] === "") {
      if (index !== 0) {
        otp[index - 1] = "";
        setOtp([...otp]);
        e.target.previousSibling.focus();
      }
    }
  };

  // clear OTP
  const clearOtp = () => {
    setOtp(new Array(6).fill(""));
    setIsotpVerifie(false);
  };

  // firestore for lite firebase
  const firestore = getFirestore(app)

  const handelSubmit = (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      confirmationResult
        .confirm(otp.join(""))
        .then((result) => {
          getUserInfo(result.user?.uid , result.user);
          setIsPhoneUserVerified(true);
          toast.success("تمت المصادقة");
          setTimeout(() => {
            navigate("/userInfo");
            setIsLoading(false);
          }, 2000);
        })
        .catch((error) => {
          setIsLoading(false);
          if (error.code === "auth/code-expired") {
            toast.error("لقد إنتهت صلاحية رمز التأكيد");
            return;
          }
          toast.error("! رمز تأكيد ليس صحيح");
          // console.error(error);
        });
    } catch (error) {
      setIsLoading(false);
      toast.error("حدث خطأ ما رجاءا قم بإدخال الرقم و المحاولة مرة أخرى");
      console.log(error.message);
    }
  };

  // get the current user info
  const getUserInfo = async (id , usere) => {
    const userRef = doc(firestore, "users", id);
    const docSnap = await getDoc(userRef);
    if (docSnap.exists()) {
      setUser(docSnap.data());
      setCurrentUser(docSnap.data());
    } else {
      console.log("No such document!");
      setUser(usere);
      setCurrentUser(usere);
    }
  };

  // set doc to the firebase
  const setUser = async (user) => {
    const userRef = doc(firestore, "users", user?.uid);
    await setDoc(userRef, {
      uid: user?.uid,
      phoneNumber: getPhone(),
      displayName: user.displayName,
      photoURL: user.photoURL,
      lastSeen: new Date().getTime(),
      photoPath: null,
      isOnline: true,
      userStatus: "جديد في واتساب",
      lastMessage: "",
    });
  };

  let count = 0;
  // submit otp
  useEffect(() => {
    if (confirmationResult.hasOwnProperty("verificationId") && count === 0) {
      count++;
      toast.success(`تم إرسال رمز التحقق إلى الرقم  ${getPhone()}`);
    }
  }, []);

  return (
    <div className="signup--container dr-en">
      <div className="otp">
        <h1>التحقق من رقمك</h1>
        <p className="d-f">
          <span>{getPhone()}</span>
          تم إرسال رمز التحقق إلى الرقم
        </p>
        <form onSubmit={handelSubmit}>
          <div className="otp-inputs">
            {otp.map((data, index) => {
              return (
                <input
                  ref={index === 0 ? firstInputRef : null}
                  itemType="number"
                  typeof="number"
                  type="tel"
                  pattern="\d*"
                  key={index}
                  value={data}
                  onChange={(e) => handleOtpChange(e.target, index)}
                  onKeyDown={(e) => handelDeleteInput(e, index)}
                  onFocus={(e) => e.target.select()}
                />
              );
            })}
          </div>
          {/* didnt get otp */}
          <p className="resend-otp">
            ليس رقمي ؟ <Link to="/signup"> تغيير رقمك </Link>
          </p>
          <div className="btns">
            <button
              className="btn otp-confiramtion"
              disabled={!isOtpVerifie || isLoading}
            >
              تأكيد
            </button>
            <button
              className="btn otp-clear"
              onClick={clearOtp}
              disabled={!isOtpVerifie || isLoading}
            >
              مسح
            </button>
          </div>
        </form>
        <ToastContainer
          position="top-center"
          autoClose={2000}
          limit={2}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          rtl={true}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="light"
        />
      </div>
    </div>
  );
}
