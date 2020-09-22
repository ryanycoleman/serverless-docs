AWS = require('aws-sdk');
const ECS = new AWS.ECS({ region: "us-west-2" });
const SM = new AWS.SecretsManager({ region: "us-west-2" })
const cfnCR = require('cfn-custom-resource');
const { sendSuccess, sendFailure, CREATE, UPDATE, DELETE } = cfnCR;

exports.handler = async (event, context) => {

  console.log(JSON.stringify(event, undefined, 2));
  if( event.RequestType === DELETE ) {
    return sendSuccess('runIndexer', {}, event)
  }

  let url;

  try {
    
    url = `http://${process.env.BUCKET_NAME}.s3-website-${process.env.AWS_REGION}.amazonaws.com`
  
    const config = {
      "index_name": "docs",
      "start_urls": [
        url
      ],
      "sitemap_urls": [
        `${url}/sitemap.xml`
      ],
      "sitemap_alternate_links": true,
      "stop_urls": [
        `${url}/docs/\\d.*/.*`
      ],
      "selectors": {
        "lvl0": {
          "selector": "//*[contains(@class,'navGroups')]//*[contains(@class,'navListItemActive')]/preceding::h3[1]",
          "type": "xpath",
          "global": true,
          "default_value": "Documentation"
        },
        "lvl1": ".post h1",
        "lvl2": ".post h2",
        "lvl3": ".post h3",
        "lvl4": ".post h4",
        "text": ".post article p, .post article li"
      },
      "selectors_exclude": [
        ".hash-link"
      ],
      "custom_settings": {
        "attributesForFaceting": [
          "language",
          "version"
        ]
      },
      "only_content_level": true,
      "conversation_id": [
        "666693828"
      ],
      "nb_hits": 4180
    }
  
    var secretParams = {
      SecretId: process.env.SECRETS_NAMESPACE + 'ALGOLIA_API_KEY'
    };

    console.log('retrieving secretvalue')
    const secretresponse = await SM.getSecretValue(secretParams).promise()
    
    const taskParams = {
      taskDefinition: process.env.DOCKER_TASK_ARN,
      launchType: 'FARGATE',
      networkConfiguration: {
        awsvpcConfiguration: {
          subnets: process.env.DOCKER_TASK_SUBNETS.split(','),
          assignPublicIp: 'ENABLED',
        }
      },
      overrides: {
        containerOverrides: [
          {
            name: "0",
            environment: [
              {
                name: 'API_KEY',
                value: secretresponse.SecretString
              },
              {
                name: 'CONFIG',
                value: JSON.stringify(config)
              }
            ],
          }
        ]
      }
    };
    console.log('starting ECS.runtask')
    const taskresponse = await ECS.runTask(taskParams).promise()
    console.log('responding successful for ECS.runtask to CFN')
    const cfnCRSuccess = await sendSuccess('runIndexer', {}, event)
    console.log(JSON.stringify(taskresponse))
  } catch(err) {
    console.log(JSON.stringify(err, undefined, 2))
    const cfnCRFailure = await sendFailure('ECS task failed to invoke successfully', event);
  }
};