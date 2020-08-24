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
        event.srcHeight = mediaInfo.video[0].height;
        event.srcWidth = mediaInfo.video[0].width;

        // Determine encoding by matching the srcHeight to the nearest profile.
        const landscapeProfiles = [1080, 720, 480, 360, 240];
        const portraitProfiles = [1920, 1280, 854, 640, 426];

        const profiles = (event.srcHeight > event.srcWidth) ? portraitProfiles : landscapeProfiles;

        let lastProfile;
        let encodeProfile;

        profiles.some(p => {
            let profile = Math.abs(event.srcHeight - p);
            if (profile > lastProfile) {
                return true;
            }

            encodeProfile = p;
            lastProfile = profile;
        });

        console.log(encodeProfile);
        event.encodingProfile = encodeProfile;

        if (event.frameCapture) {
            // Match Height x Width with the encoding profile.
            const ratios = {
                1080: 1920,
                720: 1280,
                480: 854,
                360: 640,
                240: 426
            };

            event.frameCaptureHeight = encodeProfile;
            event.frameCaptureWidth = ratios[encodeProfile];
        }

        // Update:: added support to pass in a custom encoding Template instead of using the
        // solution defaults

        if (!event.jobTemplate) {
            // Match the landscape to the encoding Profile.
            const jobTemplates = {
                1080: event.landscape_1080p,
                720: event.landscape_720p,
                480: event.landscape_480p,
                360: event.landscape_360p,
                240: event.landscape_240p,
                1920: event.portrait_1080p,
                1280: event.portrait_720p,
                854: event.portrait_480p,
                640: event.portrait_360p,
                426: event.portrait_240p
            };

            event.jobTemplate = jobTemplates[encodeProfile];
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
