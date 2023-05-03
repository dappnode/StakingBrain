# StakingBrain

The StakingBrain is the main logical component for Staking in DAppNode. It includes both a UI and a lauchpad API to allow manual and automatic keystore management, not only for solo stakers, but also for DVT/LSD technologies.

This StakingBrain will be included inside the Web3Signer Packages available in DAppNode, so the 3 services that make up each of these packages are:
    
    1. ConsenSys Web3Signer
    
    2. DB (postgres)
    
    3. Staking brain
  
The new functionalities that the StakingBrain brings are:
    
    1. Managing fee recipients individually
    
    2. Managing validator tags (e.g. "solo", "obol", "rocketpool"...)
    
    3. New UX features, like advanced mode for deeper information about validator status or light/dark mode switch

## To develop

1. Connect to your DAppNode (which needs to be running an instance of web3signer and validator in a network (e.g. Prater))

2. Clone the repo
```
git clone https://github.com/dappnode/StakingBrain
```

3. Set your current DAppNode staker config in `packages/brain/.env` :
```
NETWORK="prater"
_DAPPNODE_GLOBAL_EXECUTION_CLIENT_PRATER="goerli-erigon.dnp.dappnode.eth"
_DAPPNODE_GLOBAL_CONSENSUS_CLIENT_PRATER="prysm-prater.dnp.dappnode.eth"
```

### Local development
4. Build and start development mode
```
yarn
yarn build
yarn start:dev
```

5.Access the KeyManager UI (e.g. Prater)
```
http://localhost/?network=prater&signerUrl=http://web3signer.web3signer-prater.dappnode:9000/
```

### Docker development

4. Build and start docker development mode
```
yarn
yarn build
docker-compose -f docker-compose-dev.yml build --no-cache
docker-compose -f docker-compose-dev.yml up -d
docker logs -f brain (To watch status)
```

5. Look for container IP
```
docker inspect -f '{{range.NetworkSettings.Networks}}{{.IPAddress}}{{end}}' brain
```

6. Access the KeyManager UI (e.g. Prater)
```
http://<obtainedIP>
```

### Recomendations for developing

1. Access your dappnode using SSH and stop the brain container of your prater web3signer:

```   
docker ps | grep brain
docker stop <brainContainerName>
```

_Note: If you don't stop the brain container the cron will remove your keystores every minute._ 

2. Download the SSH plugin in Visual Studio to develop in real time.

_Note: You'll need to install your VS plugins in the dappnode to use them._ 

