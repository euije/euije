import { fetchGET, fetchPOST } from "./dataFetching.js";

// 비디오 및 음악 재생
const myAudio = document.querySelector(".backgroundmusic");
const myVideo = document.querySelector(".backgroundvideo");
const myButton = document.querySelector(".button");
myAudio.volume = 0.1;

myButton.addEventListener("click", () => {
  if (myAudio.paused && myVideo.paused) {
    myAudio.play();
    myVideo.play();
    myButton.innerHTML = "<p>Pause</p>";
  } else {
    myAudio.pause();
    myVideo.pause();
    myButton.innerHTML = "<p>Play</p>";
  }
});

const navAboutMe = document.querySelector(".nav-me");
const navCareer = document.querySelector(".nav-career");
const navGuest = document.querySelector(".nav-guest");
navAboutMe.addEventListener("click", () => {
  document.querySelector(".aboutme").scrollIntoView({behavior: "smooth", block: "end", inline: "nearest"});
});
navCareer.addEventListener("click", () => {
  document.querySelector(".career").scrollIntoView({behavior: "smooth", block: "end", inline: "nearest"});
});
navGuest.addEventListener("click", () => {
  document.querySelector(".guest").scrollIntoView({behavior: "smooth", block: "end", inline: "nearest"});
});

// 방명록 작성

const SERVER_HOST = "https://asia-northeast3-likelion-js-practice.cloudfunctions.net/api";
const NAME = "이의제";

async function getFootprint(name) {

  const path = "/footprint";
  
  // JavaScript는 비동기 언어
  // 비동기 언어란? 동시에 여러 작업을 수행하는 것이다.
  // 코드1, 코드2, 코드3 순서로 작업이 진행 될 때, 
  // 코드1이 코드2에 사용될 때 코드1의 수행을 기다리지 않고 코드2를 수행하는 것
  // 만약 코드가 시간이 오래 걸릴 경우 동기처리를 해주어야 한다.
  // -> async, await
  const res = await fetchGET(SERVER_HOST, path, { name: name });

  const message = res.data.messages;

  for(let i = 0 ; i< message.length; i++){
    const messageData = `
    <div class="board-row">
    ${message[i]}
    </div>
    `;
    document.querySelector(".board").innerHTML += messageData;
  }

  
}

async function sendFootprint() {
  const path = "/footprint";

  const messageObj = {
    content: document.querySelector(".message-content").value,
    receiverName: NAME
  };

  const res = await fetchPOST(SERVER_HOST, path, messageObj);
  if(res.status === 200){
    alert("메시지를 성공적으로 전송하였습니다!");
  }
}

window.onload = function () {
  const sendButton = document.querySelector(".send-btn");
  sendButton.addEventListener("click", () => {
    sendFootprint();
  });
  
  getFootprint(NAME);
};

// 다크모드 스위치
const checkbox = document.querySelector('.checkbox');
console.log(checkbox);

checkbox.addEventListener('click', toggleClick);

// function click() {
//     if(document.body.classList.contains('dark')) {
//         document.body.classList.remove('dark');
//         console.log('convert into Light Mode');
//     } else {
//         document.body.classList.add('dark');
//         console.log('convert into Dark Mode');
//     }
// }

function toggleClick() {
    document.body.classList.toggle('dark');
    document.querySelector('.past').style.backgroundColor = '#292c34';
    document.querySelector('.future').style.backgroundColor = '#292c34';
    
    console.log('Working!');
}
