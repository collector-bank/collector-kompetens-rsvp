const moment = require('moment');
const md = require('markdown-it')({
  breaks: true,
  linkify: true
});

function markdown(s) {
  return md.renderInline(s);
}

module.exports = {
  makeStdViewParams: function(request) {
      const adminView = request.user && request.user.isAdmin && request.cookies.adminView == "on";
      return { moment, user: request.user, settings: { adminView: adminView }, markdown };
  }
}
