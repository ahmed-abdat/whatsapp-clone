import moment from "moment";
import useSelectedUser from "../../store/useSelectedUser";
import { HiDotsVertical, HiSearch } from "react-icons/hi";
import SmileFace from "../svg/SmileFace";
import Send from "../svg/Send";
import Voice from "../svg/Voice";
import { useState } from "react";
import { BiArrowBack } from "react-icons/bi";
import ChatImg from "../../assets/img/chat-img.png";
import Message from "./Message";
import defaultAvatar from "../../assets/img/default-avatar.svg";
import { useEffect } from "react";
import { useRef } from "react";
import {
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  doc,
  setDoc,
  getDocs,
  where,
  getDoc,
  updateDoc,
  deleteField,
  serverTimestamp,
} from "firebase/firestore";
import { db, storage } from "../../config/firebase";
import SpinerLoader from "../SpinerLoader";
import useUser from "../../store/useUser";
import useUsers from "../../store/useUsers";
import ViewChatSound from "../../assets/sounds/viewMessage.mp3";
import ViewFullImage from "./ViewFullImage";
import "../styles/chatPageUser.css";
import { BsImageFill } from "react-icons/bs";
import { lazy, Suspense } from "react";
import useMessages from "../../store/useMessages";
import { getDownloadURL, ref, uploadBytesResumable } from "firebase/storage";


// lazy loade
const ViewSelectedImage = lazy(() => import("../ViewSelectedImage"));

export default function ChatPageUser() {
  // get selected user
  const getSelectedUser = useSelectedUser((state) => state.getSelectedUser);
  moment.locale("ar_SA");
  moment.updateLocale("ar_SA", {
    relativeTime: {
      future: "في %s",
      past: "منذ %s",
      s: "ثوان",
      ss: "%d ثانية",
      m: "دقيقة",
      mm: "%d دقائق",
      h: "ساعة",
      hh: "%d ساعات",
      d: "يوم",
      dd: "%d أيام",
      M: "شهر",
      MM: "%d أشهر",
      y: "سنة",
      yy: "%d سنوات",
    },
  });
  const now = moment();
  const lastSeen = getSelectedUser()?.lastSeen.seconds * 1000;
  const lastSeenMoment = moment(lastSeen);
  const HourAndMinitFormat = lastSeenMoment.format("hh:mm");
  const dateFormat = lastSeenMoment.format("DD/MM/YYYY");

  // function to check if the last seen is today or yesterday
  const currentDate = () => {
    if (lastSeenMoment.isSame(now, "day")) {
      return ` آخر ظهور اليوم عند الساعة ${HourAndMinitFormat} ${
        lastSeenMoment.format("a") === "am" ? "ص" : "م"
      }`;
    } else if (lastSeenMoment.isSame(now.clone().subtract(1, "day"), "day")) {
      return `آخر ظهور أمس عند الساعة ${HourAndMinitFormat}`;
    } else {
      return `آخر ظهور بتاريخ ${dateFormat}`;
    }
  };
  // track the time ago
  useEffect(() => {
    const interval = setInterval(() => {
      const currentTime = currentDate();
      setTimeAgo(currentTime);
    }, 10000);

    return () => clearInterval(interval);
  }, [lastSeen]);

  const [timeAgo, setTimeAgo] = useState(currentDate());
  const [file, setFile] = useState(null);
  const [isImageSelected , setIsImageSelected] = useState(false)
  const [imageAndContent , setImageAndContent] = useState(null)
  // is message arabic
  const [isArabic, setIsArabic] = useState(true);


  // message
  const [message, setMessage] = useState("");

  // lastMessage played
  const [lastPlayedMessage, setLastPlayedMessage] = useState(null);

  // set all messages 
  const setAllMessages = useMessages(state => state.setAllMessages)

  // handel message
  const handelMessage = (e) => {
    const { value } = e.target;
    const isArabic = /[\u0600-\u06FF]/.test(value);
    isArabic ? setIsArabic(true) : setIsArabic(false);

    if (value.length === 0) {
      setIsArabic(true);
    }

    setMessage(value);
  };

  // is selected user
  const isSelectedUser = useSelectedUser((state) => state.isSelectedUser);

  // set is selected user
  const setIsSelectedUser = useSelectedUser((state) => state.setIsSelectedUser);

  // set selected user
  const setSelectedUser = useSelectedUser((state) => state.setSelectedUser);

  // get current user
  const getCurrentUser = useUser((state) => state.getCurrentUser);
  // set isAllUsersShow
  const setIsAllUsersShowe = useUsers((state) => state.setIsAllUsersShow);

  // allMessages
  const lastMessage = useMessages(state => state.getLastMessage)

  // handel back
  const handelBack = () => {
    setIsAllUsersShowe(false);
    const curretnUserId = getCurrentUser().uid;
    const selectedUserId = getSelectedUser().uid;
    const uniqueChatId =
      curretnUserId > selectedUserId
        ? `${curretnUserId + selectedUserId}`
        : `${selectedUserId + curretnUserId}`;
    const chatRef = doc(db, "messages", uniqueChatId);
    getDoc(chatRef).then((doc) => {
      const document = doc.data();
      if (curretnUserId === document.sender) {
        updateDoc(chatRef, {
          sender: deleteField(),
        }).catch((error) => {
          // The document probably doesn't exist.
          console.error("Error updating document: ", error);
        });
      } else {
        updateDoc(chatRef, {
          receiver: deleteField(),
        }).catch((error) => {
          // The document probably doesn't exist.
          console.error("Error updating document: ", error);
        });
      }
    });
    setIsSelectedUser(false);
    setSelectedUser(null);
  };

  const [messages, setMessages] = useState([]);
  const [isMessagesLoaded, setIsMessagesLoaded] = useState(false);

  // get unique id for chat
  const getUniqueId = () => {
    let timestamp = new Date().getTime().toString(16); // Convert the current time to a hexadecimal string
    let random = Math.random().toString(16).slice(2); // Generate a random number and convert it to a hexadecimal string
    return timestamp + random;
  };

  // make a query to get all unread message from the selected user
  const getUnreadMessage = async () => {
    const curretnUserId = getCurrentUser().uid;
    const selectedUserId = getSelectedUser().uid;
    const uniqueChatId =
      curretnUserId > selectedUserId
        ? `${curretnUserId + selectedUserId}`
        : `${selectedUserId + curretnUserId}`;

    const collectionRef = collection(db, "messages", uniqueChatId, "chat");
    const q = query(
      collectionRef,
      where("isRead", "==", false),
      where("from", "==", curretnUserId)
    );
    getDocs(q)
      .then((querySnapshot) => {
        querySnapshot.forEach((doc) => {
          updateDoc(doc.ref, {
            isRead: true,
          }).catch((error) => {
            console.error("Error updating document: ", error);
          });
        });
      })
      .catch((error) => {
        console.log("Error getting documents: ", error);
      });
    // update last message read in both user lastMessage collection
    const currentUserLastMessageRef = collection(
      db,
      "users",
      curretnUserId,
      "lastMessage"
    );
    const selectedUserLastMessageRef = collection(
      db,
      "users",
      selectedUserId,
      "lastMessage"
    );
    updateDoc(doc(currentUserLastMessageRef, selectedUserId), {
      isRead: true,
    }).catch((e) => {
      console.log(e.message);
    });
    updateDoc(doc(selectedUserLastMessageRef, curretnUserId), {
      isRead: true,
    }).catch((e) => {
      console.log(e.message);
    });
  };

  // update how is view this chat
  const updateChatView = (uniqueChatId) => {
    const chatRef = doc(db, "messages", uniqueChatId);
    getDoc(chatRef).then((doc) => {
      const document = doc.data();
      if (document.sender && document.receiver) {
        getUnreadMessage();
      }
    });
  };

  // add message to database
  const addMessageTODataBase = async (message , uniqueChatId , selectedUserId , currentUserId , path) => {

    try {
      const docRef = doc(db, "messages", uniqueChatId);
      getDoc(docRef)
        .then((querySnapshot) => {
          let isReceived = false;
          if (querySnapshot.data().sender && querySnapshot.data().receiver) {
            console.log('both connecte');
            isReceived = true;
          }
          const messageRef = collection(db, "messages", uniqueChatId, "chat");
          const messageData = {
            id: getUniqueId(),
            content: message,
            from: currentUserId,
            to: selectedUserId,
            createdAt: serverTimestamp(),
            isRead: false,
            isReceived: isReceived,
            media : path ? path : null
          };
          addDoc(messageRef, messageData).catch((e) => console.log(e.message));
          // update last message in both user lastMessage collection
          const currentUserLastMessageRef = collection(
            db,
            "users",
            currentUserId,
            "lastMessage"
          );
          const selectedUserLastMessageRef = collection(
            db,
            "users",
            selectedUserId,
            "lastMessage"
          );
          setDoc(
            doc(currentUserLastMessageRef, selectedUserId),
            messageData
          ).catch((e) => console.log(e.message));
          setDoc(
            doc(selectedUserLastMessageRef, currentUserId),
            messageData
          ).catch((e) => console.log(e.message));
        })
        .catch((e) => console.log(e.message));
      updateChatView(uniqueChatId);
    } catch (error) {
      console.log(error.message);
    }
  };

  // update user freinds list
  const updateUserFreindsList = (selectedUserId) => {
    const currentUserId = getCurrentUser().uid;
    const currentUserFreindsListRef = collection(
      db,
      "users",
      currentUserId,
      "freindsList"
    );
    const selectedUserFreindsListRef = collection(
      db,
      "users",
      selectedUserId,
      "freindsList"
    );
    const currentUserFreindsListDoc = doc(
      currentUserFreindsListRef,
      selectedUserId
    );
    const selectedUserFreindsListDoc = doc(
      selectedUserFreindsListRef,
      currentUserId
    );
    setDoc(currentUserFreindsListDoc, {
      uid: selectedUserId,
    })
    setDoc(selectedUserFreindsListDoc, {
      uid: currentUserId,
    })
  };

  // update the message in the local state
  const updateMessageLocaly = (message ,  uniqueChatId , file) => {
    const docRef = doc(db, "messages", uniqueChatId);
      let isReceived = false
      getDoc(docRef)
      .then((querySnapshot) => {
        if (querySnapshot.data().sender && querySnapshot.data().receiver) {
          isReceived  = true
        }
      })
      const messageData = {
        id: getUniqueId(),
        content: message,
        createdAt: new Date().getTime(),
        isRead: false,
        from: getCurrentUser().uid,
        to: getSelectedUser().uid,
        isReceived,
        media : file ? file : null
      };
      updateUserFreindsList(getSelectedUser().uid);
      setMessages((prev) => [...prev, messageData]);
      setAllMessages(messageData)
      setMessage("");
      setIsArabic(true);
      scrollRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    // get unique chat id
    const getUniqueChatId = (currentUserId, selectedUserId) => {
      if (currentUserId > selectedUserId) {
        return `${currentUserId + selectedUserId}`;
      } else {
        return `${selectedUserId + currentUserId}`;
      }
    };

    // help upload image to database
    const helpUploadImage = (path) => {
      const currentUserId = getCurrentUser().uid;
      const selectedUserId = getSelectedUser().uid;
      const uniqueChatId = getUniqueChatId(currentUserId, selectedUserId);
      addMessageTODataBase(message , uniqueChatId , selectedUserId , currentUserId , path);
 
    }

    // update the photo img in firebase
    const uploadTheImageFile = (file) => {
      // unique image name
      const imageName = new Date().getTime() + file.name;
      const storageRef = ref(storage, `photo/${getCurrentUser().uid}/${imageName}`);
      const uploadTask = uploadBytesResumable(storageRef, file);
      uploadTask.on(
        "state_changed",
        (snapshot) => {
          const progress =
            (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          console.log("Upload is " + progress + "% done");
        },
        (error) => {
          console.log(error.message);
          // Handle unsuccessful uploads
        },
        () => {
          getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
            const fullPath = uploadTask.snapshot.ref.fullPath;
            console.log("File available at", downloadURL);
            helpUploadImage(downloadURL)
          });
        }
      );
    };

  // handel send message
  const handelSendMessage = (e) => {
    e && e.preventDefault();
    const selectedUserId = getSelectedUser().uid;
      const currentUserId = getCurrentUser().uid;
      const uniqueChatId = getUniqueChatId(currentUserId, selectedUserId);
    if(file || file !== null && message.length > 0 && message.trim().length > 0){
      uploadTheImageFile(file)
      updateMessageLocaly(message , uniqueChatId , file);
      setFile(null)
      return
    }
    if (message.length > 0 && message.trim().length > 0) {  
      addMessageTODataBase(message , uniqueChatId , selectedUserId , currentUserId);
      updateMessageLocaly(message , uniqueChatId )
    }
  };

  // get messages
  useEffect(() => {
    const selectedUserId = getSelectedUser().uid;
    const currentUserId = getCurrentUser().uid;
    const uniqueChatId =
      currentUserId > selectedUserId
        ? `${currentUserId + selectedUserId}`
        : `${selectedUserId + currentUserId}`;
    const messageRef = collection(db, "messages", uniqueChatId, "chat");
    const q = query(messageRef, orderBy("createdAt", "asc"));
    setIsMessagesLoaded(true);
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const messages = [];
      querySnapshot.forEach((doc) => {
        messages.push({ ...doc.data(), id: doc.id });
      });
      setMessages(messages);
      setAllMessages(messages)
      setIsMessagesLoaded(false);
    });
    return () => unsubscribe();
  }, [getSelectedUser()]);

  const scrollRef = useRef(null);

  // scroll to bottom when new message send
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
    const lastMessages = lastMessage();
    if (
      lastMessages &&
      lastMessages.from !== getCurrentUser().uid &&
      lastMessages.isReceived === true &&
      lastMessages !== lastPlayedMessage
    ) {
      const sound = new Audio(ViewChatSound);
      sound.play();
      setLastPlayedMessage(lastMessages);
    }
  }, [messages.length, lastPlayedMessage , isImageSelected]);

  //listen to change in selected user
  useEffect(() => {
    const q = query(
      collection(db, "users"),
      where("uid", "==", getSelectedUser().uid)
    );
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      querySnapshot.forEach((doc) => {
        const user = { ...doc.data(), id: doc.id };
        setSelectedUser(user);
      });
    });
    return () => unsubscribe();
  }, []);

  // handel selected image 
  const selectedImage = (img, content)=> {
    if(img && content){
      setImageAndContent({img , content})
      setIsImageSelected(true)
    }else if(img){
      setImageAndContent({img})
      setIsImageSelected(true)
    }else {
      console.log('no image selected');
    }
  }

  // handel file upload
  const handelFile = (e) => {
    const file = e.target.files[0];
    // Check if the file type is an image
    if (!file && !file.type.startsWith("image/")) {
      return;
    }
    setFile(file);
  };

  return (
    <div className={`chat-page--container ${!isSelectedUser ? "hide" : ""}`}>
      {file ? (
        <Suspense fallback={<SpinerLoader />}>
          <ViewSelectedImage
            file={file}
            setFile={setFile}
            displayName={getSelectedUser()?.displayName}
            handelMessage={handelMessage}
            isArabic={isArabic}
            handelSendMessage={handelSendMessage}
          />
        </Suspense>
      ) : isImageSelected ? (

        <ViewFullImage file={imageAndContent} setIsImageSelected={setIsImageSelected} />
  
      ) : (
        <>
          <header>
            <div className="back" onClick={handelBack}>
              <div className="icon">
                <BiArrowBack className="r-180" />
              </div>
              <div className="img">
                <img
                  src={getSelectedUser()?.photoURL || defaultAvatar}
                  alt="avatar"
                />
              </div>
            </div>
            <div className="info">
              <h3>{getSelectedUser()?.displayName || "ahmed"}</h3>
              <p className="f-ar dr">
                {getSelectedUser()?.isOnline ? "متصل الآن" : timeAgo}
              </p>
            </div>
            <div className="icons">
              <div className="icon">
                <HiSearch />
              </div>
              <div className="icon">
                <HiDotsVertical />
              </div>
            </div>
          </header>
          {/* chat container */}
          <div className="chat-content">
            <div
              className="bgi"
              style={{ backgroundImage: `url(${ChatImg})` }}
            ></div>
            <div className="message--container">
              <div className="container">
                {messages.length > 0 &&
                  messages.map((message) => (
                    <Message
                      key={message.id}
                      content={message.content}
                      isSender={message.from}
                      createdAt={message.createdAt}
                      isRead={message.isRead}
                      media={message.media}
                      id={message.id}
                      onclike={()=> selectedImage(message.media , message.content)}
                    />
                  ))}
                {isMessagesLoaded && <SpinerLoader />}
                <div ref={scrollRef}></div>
              </div>
            </div>
          </div>
          {/* footer */}
          <footer>
            <div className="icons">
              <div className="icon">
                <SmileFace />
              </div>
              <label htmlFor="file-input" className={`icon d-f`}>
                <BsImageFill />
              </label>
              <input
                onChange={handelFile}
                id="file-input"
                type="file"
                name="file"
                style={{ display: "none" }}
              />
            </div>
            <form onSubmit={handelSendMessage}>
              <div className="input">
                <input
                  type="text"
                  placeholder="اكتب رسالة"
                  onChange={handelMessage}
                  onKeyDown={(e) => {
                    e.key === "Enter" && handelSendMessage();
                  }}
                  value={message}
                  className={isArabic ? "f-ar" : "f-en dr-en"}
                />
              </div>
              {message.length > 0 ? (
                <div className="icon">
                  <button style={{ all: "unset" }}>
                    <Send />
                  </button>
                </div>
              ) : (
                <div className="icon">
                  <Voice />
                </div>
              )}
            </form>
          </footer>
        </>
      )}
    </div>
  );
}
