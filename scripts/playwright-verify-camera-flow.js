// Playwright CLI function file. Requires an open app page with fake or real media devices.
async (page) => {
  const overlaps = (a, b) => !!a && !!b
    && a.x < b.x + b.width
    && a.x + a.width > b.x
    && a.y < b.y + b.height
    && a.y + a.height > b.y;

  const retakeButton = page.getByRole('button', { name: '同题二刷' });
  if (await retakeButton.isVisible().catch(() => false)) {
    await retakeButton.click();
  } else {
    let startButton = page.getByRole('button', { name: '开始录制 →', exact: true });
    if (!(await startButton.isVisible().catch(() => false))) {
      await page.getByRole('button', { name: '练习', exact: true }).click();
      startButton = page.getByRole('button', { name: '开始录制 →', exact: true });
      await startButton.waitFor({ timeout: 8000 });
    }
    await startButton.click();
  }
  await page.waitForSelector('[data-testid="camera-device-check"]', { timeout: 8000 });
  const preflightText = await page.getByTestId('camera-device-check').innerText();
  await page.screenshot({ path: 'output/playwright/camera-ux/preflight-mobile.png', scale: 'css' });

  await page.waitForSelector('[data-testid="recording-stop"]', { timeout: 8000 });
  await page.waitForTimeout(500);

  const dock = page.getByTestId('camera-control-dock');
  const stop = page.getByTestId('recording-stop');
  const guide = page.getByTestId('composition-guide');
  const video = page.locator('video').first();
  const frontTransform = await video.evaluate(element => getComputedStyle(element).transform);
  const videoState = await video.evaluate(element => ({
    readyState: element.readyState,
    width: element.videoWidth,
    height: element.videoHeight,
  }));
  const dockBox = await dock.boundingBox();
  const stopBox = await stop.boundingBox();
  const guideBox = await guide.boundingBox();
  const viewport = page.viewportSize();
  await page.screenshot({ path: 'output/playwright/camera-ux/recording-front-mobile.png', scale: 'css' });

  if (!videoState.width || !videoState.height || videoState.readyState < 2) {
    throw new Error(`Camera preview is not rendering: ${JSON.stringify(videoState)}`);
  }
  if (Math.abs((videoState.width / videoState.height) - (9 / 16)) > 0.01) {
    throw new Error(`Camera preview is not 9:16: ${JSON.stringify(videoState)}`);
  }
  if (!dockBox || !stopBox || !guideBox) throw new Error('Camera controls or guide are not visible');
  if (overlaps(dockBox, stopBox)) throw new Error('Camera control dock overlaps the stop button');
  if (dockBox.x < 0 || dockBox.x + dockBox.width > viewport.width || dockBox.y < 0 || dockBox.y + dockBox.height > viewport.height) {
    throw new Error(`Camera dock leaves viewport: ${JSON.stringify({ dockBox, viewport })}`);
  }

  await page.getByTestId('switch-camera').click();
  await page.waitForFunction(() => {
    const prefs = JSON.parse(localStorage.getItem('kobo.cameraPreferences.v1') || '{}');
    return prefs.cameraFacing === 'environment';
  });
  await page.waitForTimeout(500);
  const mirrorDisabledOnBack = await page.getByTestId('toggle-mirror').isDisabled();
  await page.screenshot({ path: 'output/playwright/camera-ux/recording-back-mobile.png', scale: 'css' });

  await page.getByTestId('toggle-composition-guide').click();
  await page.waitForFunction(() => !document.querySelector('[data-testid="composition-guide"]'));

  await page.getByTestId('switch-camera').click();
  await page.waitForFunction(() => {
    const prefs = JSON.parse(localStorage.getItem('kobo.cameraPreferences.v1') || '{}');
    return prefs.cameraFacing === 'user';
  });
  await page.getByTestId('toggle-mirror').click();
  await page.waitForFunction(() => {
    const prefs = JSON.parse(localStorage.getItem('kobo.cameraPreferences.v1') || '{}');
    return prefs.mirrorPreview === false;
  });
  const unmirroredTransform = await video.evaluate(element => getComputedStyle(element).transform);
  await page.screenshot({ path: 'output/playwright/camera-ux/recording-unmirrored-mobile.png', scale: 'css' });

  const preferences = JSON.parse(await page.evaluate(() => localStorage.getItem('kobo.cameraPreferences.v1')));
  const alerts = await page.locator('[role="alert"]').allInnerTexts();
  await page.getByTestId('recording-stop').getByRole('button', { name: '停止录制' }).click();
  await page.getByRole('heading', { name: '保留一个优点，下一轮只改一件事。' }).waitFor({ timeout: 8000 });

  if (!mirrorDisabledOnBack) throw new Error('Mirror toggle must be disabled for the rear camera');
  if (frontTransform === unmirroredTransform) throw new Error('Mirror toggle did not change preview transform');
  if (preferences.cameraFacing !== 'user' || preferences.mirrorPreview !== false || preferences.compositionGuide !== false) {
    throw new Error(`Camera preferences were not persisted: ${JSON.stringify(preferences)}`);
  }
  if (alerts.length) throw new Error(`Unexpected camera alert: ${alerts.join(' | ')}`);

  return {
    preflightText,
    videoState,
    frontTransform,
    unmirroredTransform,
    mirrorDisabledOnBack,
    dockBox,
    stopBox,
    guideBox,
    preferences,
  };
}
