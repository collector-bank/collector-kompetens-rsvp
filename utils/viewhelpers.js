const moment = require('moment');

module.exports = {
  makeStdViewParams: function(request) {
      const adminView = request.user && request.user.isAdmin && request.cookies.adminView == "on";
      return { moment, user: request.user, settings: { adminView: adminView } };
  }
}
