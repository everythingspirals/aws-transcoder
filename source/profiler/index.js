/*********************************************************************************************************************
 *  Copyright 2020 Amazon.com, Inc. or its affiliates. All Rights Reserved.                                           *
 *                                                                                                                    *
 *  Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance    *
 *  with the License. A copy of the License is located at                                                             *
 *                                                                                                                    *
 *      http://www.apache.org/licenses/LICENSE-2.0                                                                    *
 *                                                                                                                    *
 *  or in the 'license' file accompanying this file. This file is distributed on an 'AS IS' BASIS, WITHOUT WARRANTIES *
 *  OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions    *
 *  and limitations under the License.                                                                                *
 *********************************************************************************************************************/

const AWS = require('aws-sdk');
const error = require('./lib/error.js');

exports.handler = async (event) => {
    console.log(`REQUEST:: ${JSON.stringify(event, null, 2)}`);

    const dynamo = new AWS.DynamoDB.DocumentClient({
        region: process.env.AWS_REGION
    });

    try {
        // Download DynamoDB data for the source file:
        let params = {
            TableName: process.env.DynamoDBTable,
            Key: {
                guid: event.guid
            }
        };

        let data = await dynamo.get(params).promise();

        Object.keys(data.Item).forEach(key => {
            event[key] = data.Item[key];
        });

        let mediaInfo = JSON.parse(event.srcMediainfo);
        let video = mediaInfo.video[0];
        let aspectRatio = video && video.aspectRatio;
        let rotation = video && video.rotation && video.rotation.toString();
        let isRotated = video && video.rotation == 90;
        let isFullscreen = aspectRatio && (parseFloat(aspectRatio, 10).toFixed(2) === "1.33");
        console.log(aspectRatio, parseFloat(aspectRatio, 10).toFixed(2), isFullscreen);
        const height = mediaInfo.video[0].height;
        const width = mediaInfo.video[0].width;
        event.srcHeight = isRotated ? width : height;
        event.srcWidth = isRotated ? height : width;
        let isPortrait = event.srcHeight > event.srcWidth;
        let isSquare = height == width;

        //event.inputRotate = rotation ? ('DEGREES_' + rotation) : 'AUTO';
        event.inputRotate = 'AUTO';
        // Determine encoding by matching the srcHeight to the nearest profile.
        const landscapeProfiles = [1080, 720, 480, 360, 240]
        const portraitProfiles = [1920, 1280, 854, 640, 426];

        const landscapeTemplate = {
            1080: event.landscape_1080p,
            720: event.landscape_720p,
            480: event.landscape_480p,
            360: event.landscape_360p,
            240: event.landscape_240p,
        };

        const portraitTemplates = {
            1080: event.portrait_1080p,
            720: event.portrait_720p,
            480: event.portrait_480p,
            360: event.portrait_360p,
            240: event.portrait_240p
        }

        const ratiosWide = {
            1080: 1920,
            720: 1280,
            480: 854,
            360: 640,
            240: 426
        };

        const ratiosFull = {
            1080: 1440,
            720: 960,
            480: 640,
            360: 480,
            240: 320
        };

        const ratios = isFullscreen ? ratiosFull : ratiosWide;

        const profiles = isPortrait ? portraitProfiles : landscapeProfiles;
        const compareBy = isPortrait ? event.srcHeight : event.srcWidth;

        let lastProfile;
        let encodeProfile;

        console.log('Finding profile...');

        profiles.some((p,i) => {
            let profile = Math.abs(compareBy - p);
            if (profile > lastProfile) {
                return true;
            }

            console.log(compareBy, p);
            if (compareBy >= p) {
                console.log('Setting profile to ', p);
                encodeProfile = landscapeProfiles[i];
                lastProfile = profile;
            }
        });

        console.log({ encodeProfile });
        console.log(encodeProfile);
        event.encodingProfile = encodeProfile;

        if (event.frameCapture) {
            // Match Height x Width with the encoding profile.
            if (isPortrait) {
                event.frameCaptureWidth = encodeProfile;
                event.frameCaptureHeight = ratios[encodeProfile];
            } else {
                event.frameCaptureHeight = encodeProfile;
                event.frameCaptureWidth = ratios[encodeProfile];
            }
        }

        // Update:: added support to pass in a custom encoding Template instead of using the
        // solution defaults
        console.log(event.srcWidth, event.srcHeight, isPortrait);
        console.log(event.jobTemplate);
        if (!event.jobTemplate) {
            // Match the landscape to the encoding Profile.
            const jobTemplates = isPortrait ? portraitTemplates : landscapeTemplate;

            let jobTemplate = jobTemplates[encodeProfile];

            let postFix = '';
            if (isFullscreen) postFix = '_FULL';
            if (isSquare) postFix = '_SQUARE';
            jobTemplate = jobTemplate + postFix;
            event.jobTemplate = jobTemplate;

            console.log(`Chosen template:: ${event.jobTemplate}`);

            event.isCustomTemplate = false;
        } else {
            event.isCustomTemplate = true;
        }
    } catch (err) {
        await error.handler(event, err);
        throw err;
    }

    console.log(`RESPONSE:: ${JSON.stringify(event, null, 2)}`);
    return event;
};
