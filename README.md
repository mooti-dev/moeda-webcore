# MOEDA-webcore-2
## Message sent from client to server
	
	{
                "messageType: "clientToServer",
                "nonce" : "<base64 encoded nonce>",
                "sendPubkey": "<base64 encoed pubkey>",
                "message" : "<base64 encoded message to send to server>"
       }

## encrypted message contained in message field above
	{
		"requestType": "<corresponds to endpoint name>"
	}     

*may contain any additional fields*


## Message sent from server to client
	{
		"message": "<base64 encoded encrypted return from webservice call>",
		"nonce": "<base64 encoded nonce used for encryption>",
	}
