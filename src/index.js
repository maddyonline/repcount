const SEEN_SIZE = 60;
const PATIENCE = 15;
const WINDOW_LENGTH = 10
const LOOKUP_LENGTH = 4

function computeAll(frames, frameId) {
    let parts = ['nose', 'left_eye', 'right_eye', 'left_ear', 'right_ear', 'left_shoulder', 'right_shoulder'];
    let defaultResults = parts.map(_ => 0.);

    if (!frames || frames.length < 3) {
        return defaultResults;
    }
    // let getX = (pose, part) => pose.keypoints.filter(x => x.part === part)[0].position.x;
    let getY = (pose, part) => pose.keypoints.filter(({ name }) => name === part)[0].y;

    let poseNow = frames[frameId];
    let posePrev = frames[frameId - 1];

    if (!poseNow || !poseNow.keypoints || !posePrev || !posePrev.keypoints) {
        return defaultResults;
    }

    let results = parts.map(part => (getY(poseNow, part) - getY(posePrev, part)));
    return results;

}

function checkSignTriggered(context, windowLength = WINDOW_LENGTH, lookupLength = LOOKUP_LENGTH) {
    const { seen } = context;
    /*

    |seen| >= 10
    [{1}, {2}, ...., {10}, {11}, {12}]

    */
    if (seen.length < windowLength)
        return false;


    /*
        lookupLength -> recent history
        poses:
        [{9}, {10}, {11}, {12}]

        [
            velocity-of-7-parts-for-pose-{9}-wrt-previous-pose,
            velocity-of-7-parts-for-pose-{10}-wrt-previous-pose,
            velocity-of-7-parts-for-pose-{11}-wrt-previous-pose,
            velocity-of-7-parts-for-pose-{12}-wrt-previous-pose,
        ]

        =>
        [
            [Neg, Neg, Neg, ...., Neg],
            [Neg, Pos, Neg, ...., Pos],
            ....
            [Pos, Pos, Pos, ..., Pos],
        ]

        =>
        [
            0 === 7
            2 === 7
            ...
            7 === 7
        ]

        =>
        [
            False,
            False,
            ...
            True,
        ]

        => [True, True, True] [False]
    */

    const poses = seen.slice(seen.length - lookupLength, seen.length);
    const velocities = poses.map((_, i) => computeAll(seen, seen.length - lookupLength + i));
    const recentFrames = velocities.map(varr => varr.map(v => v < 0).filter(v => v).length === varr.length)
    let cond1 = recentFrames.slice(0, recentFrames.length - 1).filter(v => v).length === (recentFrames.length - 1);
    let cond2 = recentFrames.slice(recentFrames.length - 1, recentFrames.length).filter(v => v).length === 0;

    return cond1 && cond2;

}

export function moveUpTriggered(context) {
    return checkSignTriggered(context);
}



export const countReps = (framesRaw) => {
    const intervals = [];
    const frames = framesRaw.map(f => f[0])
    const seenSize = SEEN_SIZE;
    const patience = PATIENCE;
    let count = 0;
    let shouldCount = true;
    let patienceCounter = 0;
    for (let i = 0; i < frames.length - seenSize + 1; i++) {
        const context = { seen: frames.slice(i, i + seenSize) }
        const result = moveUpTriggered(context);
        if (shouldCount && result === true) {
            count += result;
            shouldCount = false;
        }
        if (!shouldCount && patienceCounter < patience) {
            patienceCounter += 1;
        } else if (!shouldCount && patienceCounter == patience) {
            patienceCounter = 0;
            shouldCount = true;
        }
        if (result) {
            intervals.push([i, i + seenSize, i + seenSize]);
        }
    }
    const result = {
        intervals,
        count,
        meta: {
            SEEN_SIZE,
            PATIENCE,
            WINDOW_LENGTH,
            LOOKUP_LENGTH,
        }
    }
    return result;
}
