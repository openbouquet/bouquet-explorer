app-dashboard
==============

Dashboard application, upstreamed from GitHub's base app.

Dashboard App Specs contained in Google Docs.

## running

Install the dependencies

ruby
sass - via ruby gems 'gem install sass'

```
npm install
bower install 

```
Trigger builds when code changes
```
grunt watch
```

View the build results
```
open dist/index.html
```
Or by specifying a project (and domain) :

```
https://api.squidsolutions.com/apps/release/app-dashboard/dist/index.html?projectId=musicbrainz&domainId=artist
```