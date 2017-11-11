# MOEDA-webcore-2

Each client will obtain the server's public key by calling the endpoint

**/pubkey**

this endpoint will simply return the base64 encoded public key for the server.  This public key will be used
when sending messages over the websocket connnection.


# Websocket messages
## Messages sent from client to server
	
	{
                "messageType: "clientToServer",
                "nonce" : "<base64 encoded nonce used to encrypt the message>",
                "sender": "<base64 encoded client's  pubkey>",
                "message" : "<base64 encoded message to send to server>"
       }

## encrypted message contained in message field above
	{
		"requestType": "<corresponds to endpoint name>"
	}     

*may contain any additional fields*


## Messages sent from server to client
	{
		"message": "<base64 encoded encrypted return from webservice call>",
		"nonce": "<base64 encoded nonce used for encryption>",
	}
