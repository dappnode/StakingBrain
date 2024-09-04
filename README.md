# StakingBrain

Staking Brain is a critical logical component for Staking in DAppNode. It provides a user interface and a Launchpad API that allow manual and automatic keystore management. Designed to support not only solo stakers, but also DVT/LSD technologies, Staking Brain streamlines the staking process for all users.

Within the Dappnode environment, Staking Brain is incorporated into the Web3Signer packages (gnosis, mainnet, prater, lukso and holesky). It ensures that user configurations for validators are reliably maintained. Please note that Staking Brain does not store keystores itself, but ensures their storage in the web3signer. It also maintains consistency between the validator service and web3signer service, as the validator must recognize all the pubkeys of validators whose keystores have been imported into the signer.

Each Web3Signer package includes four services:

    1. ConsenSys Web3Signer

    2. DB (postgres)

    3. Staking Brain

    4. Flyway (runs only once when the package starts and then stops)

The new functionalities that the StakingBrain brings are:

    1. Individual management of fee recipients

    2. Management of validator tags (e.g., "solo", "obol", "rocketpool")

    3. New UX features, such as an advanced mode for detailed validator status and a light/dark mode switch

## Development Guide

Follow these steps to develop with Staking Brain:

    1. Connect to your DAppNode (which should be running an instance of web3signer and validator in a network, e.g., Prater).

    2. Clone the repository:

```
git clone https://github.com/dappnode/StakingBrain
```

3. Set your current DAppNode staker config in `packages/brain/.env` :

```
NETWORK="prater"
_DAPPNODE_GLOBAL_EXECUTION_CLIENT_PRATER="goerli-erigon.dnp.dappnode.eth"
_DAPPNODE_GLOBAL_CONSENSUS_CLIENT_PRATER="prysm-prater.dnp.dappnode.eth"
```

### A) Local development

4. Build and start development mode

```
yarn
yarn build
yarn dev
```

5.Access the KeyManager UI (e.g. Prater)

```
http://localhost/?network=prater&signerUrl=http://web3signer.web3signer-prater.dappnode:9000/
```

### B) Docker development

4. Build and start docker development mode

```
yarn
yarn build
docker-compose -f docker-compose-dev.yml build --no-cache
docker-compose -f docker-compose-dev.yml up -d
docker logs -f brain (To watch status)
```

5. Find the container IP

```
docker inspect -f '{{range.NetworkSettings.Networks}}{{.IPAddress}}{{end}}' brain
```

6. Access the KeyManager UI (e.g. Prater)

```
http://<obtainedIP>
```

### Development Recommendations

    1. Connect to your DAppNode using SSH and stop the brain container of your Prater web3signer:

```
docker ps | grep brain
docker stop <brainContainerName>
```

_Note: If you do not stop the brain container, the cron will remove your keystores every minute._

2. Install the SSH plugin in Visual Studio to develop in real time.

_Note: You'll need to install your VS plugins in the dappnode to use them._
