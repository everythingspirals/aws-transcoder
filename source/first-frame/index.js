const AWS = require('aws-sdk');

exports.handler = async (event) => {
    console.log(`REQUEST:: ${JSON.stringify(event, null, 2)}`);

    const s3 = new AWS.S3();

    try {
        const sourceBucket = event['Records'][0]['s3']['bucket']['name'];
        const  key = event['Records'][0]['s3']['object']['key'];
        const copySource = sourceBucket + '/' + key;

        const keySplit = key.split('thumbnails');
        const newKey = keySplit[0] + 'mobile.jpg';

        var params = {
            Bucket: sourceBucket, 
            CopySource: copySource, 
            Key: newKey
           };
           
        let result = await s3.copyObject(params).promise();
        console.log(result);
    } catch (err) {
        await console.error(event, err);
        throw err;
    }

    return;
};