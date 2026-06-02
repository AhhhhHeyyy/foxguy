const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y)

const REF_FACE_W = 0.35 // typical face width in normalized coords at reference distance

// Returns head offset (x/y: -1~1) and relative distance (z: 0=reference, +closer, -further)
export function computeHeadPos(landmarks) {
  const nose = landmarks[1]
  const faceW = Math.abs(landmarks[263].x - landmarks[33].x)
  const z = Math.max(-1, Math.min(1, faceW / REF_FACE_W - 1))
  return { x: (nose.x - 0.5) * 2, y: (nose.y - 0.5) * 2, z }
}

export function computeEAR(landmarks) {
  const lm = landmarks

  const earLeft = dist(lm[159], lm[145]) / dist(lm[33], lm[133])
  const earRight = dist(lm[386], lm[374]) / dist(lm[362], lm[263])
  const earAvg = (earLeft + earRight) / 2

  // Gaze: iris center (468=left, 473=right) relative to eye corners
  const leftEyeWidth = Math.abs(lm[133].x - lm[33].x)
  const leftMidX = (lm[33].x + lm[133].x) / 2
  const leftMidY = (lm[33].y + lm[133].y) / 2
  const gazeXLeft = (lm[468].x - leftMidX) / (leftEyeWidth * 0.5)
  const gazeYLeft = (lm[468].y - leftMidY) / (leftEyeWidth * 0.35)

  const rightEyeWidth = Math.abs(lm[263].x - lm[362].x)
  const rightMidX = (lm[362].x + lm[263].x) / 2
  const rightMidY = (lm[362].y + lm[263].y) / 2
  const gazeXRight = (lm[473].x - rightMidX) / (rightEyeWidth * 0.5)
  const gazeYRight = (lm[473].y - rightMidY) / (rightEyeWidth * 0.35)

  return {
    earAvg,
    // Mirror X for selfie mode (camera flips left/right)
    gazeX: -((gazeXLeft + gazeXRight) / 2),
    gazeY: (gazeYLeft + gazeYRight) / 2,
  }
}
