// Playwright CLI function file. Load on about:blank before navigating to the app:
// playwright-cli -s=kobo-camera run-code --filename scripts/playwright-fake-media.js
async (page) => {
  await page.addInitScript(() => {
    try {
      localStorage.setItem('kobo.onboarded', '1');
      localStorage.setItem('kobo.voiceOnly', '0');
      localStorage.removeItem('kobo.cameraPreferences.v1');
    } catch {}

    const resources = [];
    const requestedFacing = (video) => {
      const value = video && typeof video === 'object' ? video.facingMode : null;
      if (typeof value === 'string') return value;
      return value?.exact || value?.ideal || 'user';
    };

    const makeVideoTrack = (facing) => {
      const canvas = document.createElement('canvas');
      canvas.width = 640;
      canvas.height = 480;
      const context = canvas.getContext('2d');
      let frame = 0;

      const draw = () => {
        frame += 1;
        context.fillStyle = facing === 'environment' ? '#164e63' : '#4c0519';
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.fillStyle = '#f8fafc';
        context.font = 'bold 36px sans-serif';
        context.textAlign = 'center';
        context.fillText(facing === 'environment' ? 'BACK CAMERA' : 'FRONT CAMERA', 320, 210);
        context.font = '22px sans-serif';
        context.fillText(String(frame), 320, 255);
        context.fillStyle = '#f59e0b';
        context.fillRect(70, 80, 90, 90);
        window.requestAnimationFrame(draw);
      };
      draw();

      const track = canvas.captureStream(30).getVideoTracks()[0];
      Object.defineProperty(track, 'label', {
        configurable: true,
        value: facing === 'environment' ? 'Fake Back Camera' : 'Fake Front Camera',
      });
      track.getSettings = () => ({ facingMode: facing, width: 640, height: 480 });
      resources.push(canvas, track);
      return track;
    };

    const makeAudioTrack = () => {
      const AudioCtor = window.AudioContext || window.webkitAudioContext;
      const audio = new AudioCtor();
      const oscillator = audio.createOscillator();
      const gain = audio.createGain();
      const destination = audio.createMediaStreamDestination();
      gain.gain.value = 0.02;
      oscillator.frequency.value = 220;
      oscillator.connect(gain).connect(destination);
      oscillator.start();
      const track = destination.stream.getAudioTracks()[0];
      Object.defineProperty(track, 'label', { configurable: true, value: 'Fake Microphone' });
      resources.push(audio, oscillator, track);
      return track;
    };

    const mediaDevices = {
      getUserMedia: async (constraints = {}) => {
        const stream = new MediaStream();
        if (constraints.video) stream.addTrack(makeVideoTrack(requestedFacing(constraints.video)));
        if (constraints.audio) stream.addTrack(makeAudioTrack());
        return stream;
      },
      enumerateDevices: async () => [
        { kind: 'videoinput', deviceId: 'front', groupId: 'fake', label: 'Fake Front Camera' },
        { kind: 'videoinput', deviceId: 'back', groupId: 'fake', label: 'Fake Back Camera' },
        { kind: 'audioinput', deviceId: 'mic', groupId: 'fake', label: 'Fake Microphone' },
      ],
      getSupportedConstraints: () => ({ facingMode: true, width: true, height: true }),
      addEventListener: () => {},
      removeEventListener: () => {},
    };

    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: mediaDevices });
    window.__fakeMediaResources = resources;
  });
}
