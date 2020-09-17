// Code sample via https://aws.amazon.com/blogs/compute/implementing-default-directory-indexes-in-amazon-s3-backed-amazon-cloudfront-origins-using-lambdaedge/
exports.handler = async event => {
    
  // Extract the request from the CloudFront event that is sent to Lambda@Edge 
  var request = event.Records[0].cf.request;

  // Extract the URI from the request
  var olduri = request.uri;

  // Append /index.html to any path that doesn't end in .html, stripping trailing '/' if present
  // * /foo -> /foo/index.html
  // * /foo/ -> /foo/index.html
  // * /foo/index.html -> /foo/index.html
  // * /foo/image.png -> /foo/image.png
  // * /foo.bar/ -> /foo.bar/index.html
  // * /foo.bar/image.png -> /foo.bar/image.png
  var newuri = olduri.replace(/(^(.(?!\.[^/]+$))+?)\/?$/, '$1/index.html');

  // Replace the received URI with the URI that includes the index page
  request.uri = newuri;
  
  // Return to CloudFront
  return request;
}
