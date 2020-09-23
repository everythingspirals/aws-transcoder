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

const fs = require('fs');
const AWS = require('aws-sdk');

const CATEGORY = 'VOD';
const DESCRIPTION = 'video on demand on aws';

const qvbrPresets = [
    {
        name: 'LANDSCAPE_240',
        file: './lib/landscape-240.json'
    },
    {
        name: 'LANDSCAPE_240_FULL',
        file: './lib/landscape-240-full.json'
    },
    {
        name: 'PORTRAIT_240',
        file: './lib/portrait-240.json'
    },
    {
        name: 'PORTRAIT_240_FULL',
        file: './lib/portrait-240-full.json'
    },
    {
        name: 'LANDSCAPE_360',
        file: './lib/landscape-360.json'
    },
    {
        name: 'LANDSCAPE_360_FULL',
        file: './lib/landscape-360-full.json'
    },
    {
        name: 'PORTRAIT_360',
        file: './lib/portrait-360.json'
    },
    {
        name: 'PORTRAIT_360_FULL',
        file: './lib/portrait-360-full.json'
    },
    {
        name: 'LANDSCAPE_480',
        file: './lib/landscape-480.json'
    },
    {
        name: 'LANDSCAPE_480_FULL',
        file: './lib/landscape-480-full.json'
    },
    {
        name: 'PORTRAIT_480',
        file: './lib/portrait-480.json'
    },
    {
        name: 'PORTRAIT_480_FULL',
        file: './lib/portrait-480-full.json'
    },
    {
        name: 'LANDSCAPE_720',
        file: './lib/landscape-720.json'
    },
    {
        name: 'LANDSCAPE_720_FULL',
        file: './lib/landscape-720-full.json'
    },
    {
        name: 'PORTRAIT_720',
        file: './lib/portrait-720.json'
    },
    {
        name: 'PORTRAIT_720_FULL',
        file: './lib/portrait-720-full.json'
    },
    {
        name: 'LANDSCAPE_1080',
        file: './lib/landscape-1080.json'
    },
    {
        name: 'LANDSCAPE_1080_FULL',
        file: './lib/landscape-1080-full.json'
    },
    {
        name: 'PORTRAIT_1080',
        file: './lib/portrait-1080.json'
    },
    {
        name: 'PORTRAIT_1080_FULL',
        file: './lib/portrait-1080-full.json'
    }
];

const qvbrTemplates = [
    {
        name: 'LANDSCAPE_240',
        file: './templates/landscape-240.json'
    },
    {
        name: 'LANDSCAPE_240_FULL',
        file: './templates/landscape-240-full.json'
    },
    {
        name: 'PORTRAIT_240',
        file: './templates/portrait-240.json'
    },
    {
        name: 'PORTRAIT_240_FULL',
        file: './templates/portrait-240-full.json'
    },
    {
        name: 'LANDSCAPE_360',
        file: './templates/landscape-360.json'
    },
    {
        name: 'LANDSCAPE_360_FULL',
        file: './templates/landscape-360-full.json'
    },
    {
        name: 'PORTRAIT_360',
        file: './templates/portrait-360.json'
    },
    {
        name: 'PORTRAIT_360_FULL',
        file: './templates/portrait-360-full.json'
    },
    {
        name: 'LANDSCAPE_480',
        file: './templates/landscape-480.json'
    },
    {
        name: 'LANDSCAPE_480_FULL',
        file: './templates/landscape-480-full.json'
    },
    {
        name: 'PORTRAIT_480',
        file: './templates/portrait-480.json'
    },
    {
        name: 'PORTRAIT_480_FULL',
        file: './templates/portrait-480-full.json'
    },
    {
        name: 'LANDSCAPE_720',
        file: './templates/landscape-720.json'
    },
    {
        name: 'LANDSCAPE_720_FULL',
        file: './templates/landscape-720-full.json'
    },
    {
        name: 'PORTRAIT_720',
        file: './templates/portrait-720.json'
    },
    {
        name: 'PORTRAIT_720_FULL',
        file: './templates/portrait-720-full.json'
    },
    {
        name: 'LANDSCAPE_1080',
        file: './templates/landscape-1080.json'
    },
    {
        name: 'LANDSCAPE_1080_FULL',
        file: './templates/landscape-1080-full.json'
    },
    {
        name: 'PORTRAIT_1080',
        file: './templates/portrait-1080.json'
    },
    {
        name: 'PORTRAIT_1080_FULL',
        file: './templates/portrait-1080-full.json'
    }
];

const mediaPackageTemplates = [];

// Get the Account regional MediaConvert endpoint for making API calls
const GetEndpoints = async () => {
    const mediaconvert = new AWS.MediaConvert();
    const data = await mediaconvert.describeEndpoints().promise();

    return {
        EndpointUrl: data.Endpoints[0].Url
    };
};

const _createPresets = async (instance, presets, stackName) => {
    for (let preset of presets) {
        // Add stack name to the preset name to ensure it is unique
        let name = stackName + preset.name;
        let params = {
            Name: name,
            Category: CATEGORY,
            Description: DESCRIPTION,
            Settings: JSON.parse(fs.readFileSync(preset.file, 'utf8'))
        };

        await instance.createPreset(params).promise();
        console.log(`preset created:: ${name}`);
    }
};

const _createTemplates = async (instance, templates, stackName) => {
    for (let tmpl of templates) {
        // Load template and set unique template name
        let params = JSON.parse(fs.readFileSync(tmpl.file, 'utf8'));
        params.Name = stackName + params.Name;

        // Update preset names unless system presets
        params.Settings.OutputGroups.forEach(group => {
            group.Outputs.forEach(output => {
                if (!output.Preset.startsWith('System')) {
                    output.Preset = stackName + output.Preset;
                }
            });
        });

        await instance.createJobTemplate(params).promise();
        console.log(`template created:: ${params.Name}`);
    }
};

const Create = async (config) => {
    const mediaconvert = new AWS.MediaConvert({
        endpoint: config.EndPoint,
        region: process.env.AWS_REGION
    });

    let presets = [];
    let templates = [];

    if (config.EnableMediaPackage === 'true') {
        // Use qvbr presets but Media Package templates
        presets = qvbrPresets;
        templates = mediaPackageTemplates;
    } else {
        // Use qvbr presets and templates
        presets = qvbrPresets;
        templates = qvbrTemplates;
    }

    await _createPresets(mediaconvert, presets, config.StackName);
    await _createTemplates(mediaconvert, templates, config.StackName);

    return 'success';
};

const Update = async (config) => {
    const mediaconvert = new AWS.MediaConvert({
        endpoint: config.EndPoint,
        region: process.env.AWS_REGION
    });

    let enableMediaPackage = 'false';

    // Check if the curent templates are MediaPackage or not.
    let data = await mediaconvert.listJobTemplates({ Category: CATEGORY }).promise();
    data.JobTemplates.forEach(template => {
        if (template.Name === config.StackName + '_Ott_720p_Avc_Aac_16x9_mvod') {
            enableMediaPackage = 'true';
        }
    });

    if (config.EnableMediaPackage != enableMediaPackage) {
        if (config.EnableMediaPackage == 'true') {
            console.log('Deleting qvbr templates and creating MediaPackage templates');
            await _deleteTemplates(mediaconvert, qvbrTemplates, config.StackName);
            await _createTemplates(mediaconvert, mediaPackageTemplates, config.StackName);
        } else {
            console.log('Deleting MediaPackage templates and creating qvbr templates');
            await _deleteTemplates(mediaconvert, mediaPackageTemplates, config.StackName);
            await _createTemplates(mediaconvert, qvbrTemplates, config.StackName);
        }
    } else {
        console.log('No changes to the MediaConvert templates');
    }

    return 'success';
};

const _deletePresets = async (instance, presets, stackName) => {
    for (let preset of presets) {
        let name = stackName + preset.name;

        await instance.deletePreset({ Name: name }).promise();
        console.log(`preset deleted:: ${name}`);
    }
};

const _deleteTemplates = async (instance, templates, stackName) => {
    for (let tmpl of templates) {
        let name = stackName + tmpl.name;

        await instance.deleteJobTemplate({ Name: name }).promise();
        console.log(`template deleted:: ${name}`);
    }
};

const Delete = async (config) => {
    const mediaconvert = new AWS.MediaConvert({
        endpoint: config.EndPoint,
        region: process.env.AWS_REGION
    });

    try {
        let presets = [];
        let templates = [];

        if (config.EnableMediaPackage === 'true') {
            // Use qvbr presets but Media Package templates
            presets = qvbrPresets;
            templates = mediaPackageTemplates;
        } else {
            // Use qvbr presets and templates
            presets = qvbrPresets;
            templates = qvbrTemplates;
        }

        await _deletePresets(mediaconvert, presets, config.StackName);
        await _deleteTemplates(mediaconvert, templates, config.StackName);
    } catch (err) {
        console.log(err);
        throw err;
    }

    return 'success';
};

module.exports = {
    getEndpoint: GetEndpoints,
    createTemplates: Create,
    updateTemplates: Update,
    deleteTemplates: Delete
};
