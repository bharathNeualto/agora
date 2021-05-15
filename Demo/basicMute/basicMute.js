// create Agora client
var client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });

var localTracks = {
  videoTrack: null,
  audioTrack: null
};

var localTrackState = {
  videoTrackEnabled: true,
  audioTrackEnabled: true
}

var remoteUsers = {};
// Agora client options
var options = {
  appid: "ec98c2a8f98942e2afcf05d651c58a60",
  channel: "testing",
  uid: null,
  token: null
};

// the demo can auto join channel with params in url
$(() => {
 
  var urlParams = new URL(location.href).searchParams;
  options.appid = urlParams.get("appid");
  options.channel = urlParams.get("channel");
  options.token = urlParams.get("token");
  console.log(options);
  if (options.appid && options.channel) {
    // $("#appid").val(options.appid);
    // $("#token").val(options.token);
    // $("#channel").val(options.channel);
    // $("#join-form").submit();
  }

})


$("#join-form").submit(async function (e) {
  e.preventDefault();
  $("#join").attr("disabled", true);
  try {
    console.log("before () ajax" );
    // options.appid = $("#appid").val();
    // options.token = $("#token").val();
    // options.channel = $("#channel").val();
    var urlParams = new URL(location.href).searchParams;
    options.appid = urlParams.get("appid");
    options.channel = urlParams.get("channel");
    options.token = urlParams.get("token");

    console.log(options);
    await join();
    if(options.token) {
      $("#success-alert-with-token").css("display", "block");
    } else {
      //$("#success-alert a").attr("href", `index.html?appid=${options.appid}&channel=${options.channel}&token=${options.token}`);
      //$("#success-alert").css("display", "block");
    }
  } catch (error) {
    console.error(error);
  } finally {
    $("#leave").attr("disabled", false);
  }
});

// function getData() { 
//   console.log("in function");
//   console.log(options);
//   console.log("option printed");
//   return $.ajax({
//     url: "http://localhost:8080/agora/vc/token", 
//     type: "GET",
//     // async: false,
//     dataType: "jsonp",
//     // success: function(response){
//     //   // console.log($.parseJSON(response))
//     //   r= JSON.decode(response);
//     //   console.log(r)
//     //   // options.appid = response.appid;
//     //   // options.token = response.token;
//     //   // options.channel = response.channel;
//     //   console.log(options)
//     // }
//   });
  
// };

// function getData()
// {
//   var request = new XMLHttpRequest()

// request.open('GET', 'http://localhost:8080/agora/vc/token', true)
// request.setRequestHeader("dataType","jsonp")
// request.onload = function () {
//   // Begin accessing JSON data here
//   var data = JSON.parse(this.response)
//   console.log("this is my data => "+data)
//   if (request.status >= 200 && request.status < 400) {
//     // data.forEach((movie) => {
//     //   console.log(movie.title)
//     console.log("this is my data 2 => "+data)
//     // })
//   } else {
//     console.log('error')
//   }
// }

// return request.send()
// };

function getData()
{
  console.log("before")
  return $.ajax({
    url: "http://localhost:8080/agora/vc/token",
    global: false,
    type: "GET",
    dataType: "jsonp",
    contentType: "application/json; charset=utf-8",
    success: function(resp)
    {
      console.log(resp.text())
      if(resp != "" && resp != null)
      {
        // console.log("this is my data 2 => "+resp)
      }	
    },
    error :  function(msg,arg1,arg2)
    {
      return false;
    }
  });
  // console.log("after")
};







$("#leave").click(function (e) {
  leave();
});

$("#mute-audio").click(function (e) {
  if (localTrackState.audioTrackEnabled) {
    muteAudio();
  } else {
    unmuteAudio();
  }
});

$("#mute-video").click(function (e) {
  if (localTrackState.videoTrackEnabled) {
    muteVideo();
  } else {
    unmuteVideo();
  }
})

async function join() {
  // add event listener to play remote tracks when remote users join, publish and leave.
  client.on("user-published", handleUserPublished);
  client.on("user-joined", handleUserJoined);
  client.on("user-left", handleUserLeft);

  // join a channel and create local tracks, we can use Promise.all to run them concurrently
  [ options.uid, localTracks.audioTrack, localTracks.videoTrack ] = await Promise.all([
    // join the channel
    client.join(options.appid, options.channel, options.token || null),
    // create local tracks, using microphone and camera
    AgoraRTC.createMicrophoneAudioTrack(),
    AgoraRTC.createCameraVideoTrack()
  ]);

  showMuteButton();
  
  // play local video track
  localTracks.videoTrack.play("local-player");
  $("#local-player-name").text(`localVideo(${options.uid})`);

  // publish local tracks to channel
  await client.publish(Object.values(localTracks));
  console.log("publish success");
}

async function leave() {
  for (trackName in localTracks) {
    var track = localTracks[trackName];
    if(track) {
      track.stop();
      track.close();
      localTracks[trackName] = undefined;
    }
  }

  // remove remote users and player views
  remoteUsers = {};
  $("#remote-playerlist").html("");

  // leave the channel
  await client.leave();

  $("#local-player-name").text("");
  $("#join").attr("disabled", false);
  $("#leave").attr("disabled", true);
  hideMuteButton();
  console.log("client leaves channel success");
}

async function subscribe(user, mediaType) {
  const uid = user.uid;
  // subscribe to a remote user
  await client.subscribe(user, mediaType);
  console.log("subscribe success");

  // if the video wrapper element is not exist, create it.
  if (mediaType === 'video') {
    if ($(`#player-wrapper-${uid}`).length === 0) {
      const player = $(`
        <div id="player-wrapper-${uid}">
          <p class="player-name">remoteUser(${uid})</p>
          <div id="player-${uid}" class="player"></div>
        </div>
      `);
      $("#remote-playerlist").append(player);
    }

    // play the remote video.
    user.videoTrack.play(`player-${uid}`);
  }
  if (mediaType === 'audio') {
    user.audioTrack.play();
  }
}

function handleUserJoined(user) {
  const id = user.uid;
  remoteUsers[id] = user;
}

function handleUserLeft(user) {
  const id = user.uid;
  delete remoteUsers[id];
  $(`#player-wrapper-${id}`).remove();
}

function handleUserPublished(user, mediaType) {
  subscribe(user, mediaType);
}

function hideMuteButton() {
  $("#mute-video").css("display", "none");
  $("#mute-audio").css("display", "none");
}

function showMuteButton() {
  $("#mute-video").css("display", "inline-block");
  $("#mute-audio").css("display", "inline-block");
}

async function muteAudio() {
  if (!localTracks.audioTrack) return;
  await localTracks.audioTrack.setEnabled(false);
  localTrackState.audioTrackEnabled = false;
  $("#mute-audio").text("Unmute Audio");
}

async function muteVideo() {
  if (!localTracks.videoTrack) return;
  await localTracks.videoTrack.setEnabled(false);
  localTrackState.videoTrackEnabled = false;
  $("#mute-video").text("Unmute Video");
}

async function unmuteAudio() {
  if (!localTracks.audioTrack) return;
  await localTracks.audioTrack.setEnabled(true);
  localTrackState.audioTrackEnabled = true;
  $("#mute-audio").text("Mute Audio");
}

async function unmuteVideo() {
  if (!localTracks.videoTrack) return;
  await localTracks.videoTrack.setEnabled(true);
  localTrackState.videoTrackEnabled = true;
  $("#mute-video").text("Mute Video");
}