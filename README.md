Bouquet Explorer
================

Explorer application to use with Bouquet server.  

## running

Install the dependencies  

ruby  
sass - via ruby gems 'gem install sass'

```
npm install
bower install 

Build and run the app in an embedded http server  
```
grunt run
```
Then open the index.html file making sure the apiUrl you set matches your Bouquet Server  
http://localhost:8081/dist/index.html?apiUrl=http://localhost:9000&api=dev