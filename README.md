# StakingBrain

At the moment, the Web3Signer packages include 3 services, which are: Key Manager UI, web3signer and DB (postgres). We had to include scripts to the original ConsenSys Web3Signer so that we could be sure of the persistence of the keystores imported via the UI to the signer.

However, for the sake of simplification, consistency and DVT integration, we have planned to create a *Staking Brain* specified below:

1. DAppNodePackage Web3Signer will include 3 services:
    1. Raw ConsenSys Web3Signer
    2. DB (postgres)
    3. Staking brain
    
![Diagram](https://user-images.githubusercontent.com/47595345/213261343-2a387f40-5a59-4ab5-9980-e570fdccb966.png)
    
2. Staking Brain components:
    1. Frontend:
        1. Current Key Manager UI + fee recipient modification functionality + tag + readOnlyFeeRecipient
        2. Calls to the backend:
            1. GET (in rendering) —triggers—> getTruth() + writeToDB() + readFromDB()
            2. POST —triggers—> postTruth() + getTruth() + writeToDB() + readFromDB()
            3. DELETE —triggers—> deletePubkeys() [already done]
            4. PUT —triggers—> putFeeRecipient() [for solo stakers] …Needs research!
    2. Backend:
        1. JSON file to act as a DB. The format will be the following:
            
            ```json
            {
            	"<pubkey>": {
            			"tag": "soloStaker",
            			"feeRecipientValidator": "0x000...00",
            			"feeRecipientUser": "0x000...00",
            			"isAutomaticImport": "false"
            		}
            }
            ```
            
        2. Cron jobs (which will be migrated from the DAppNode Web3Signer Package and translated from bash to TS) that will ensure:
            1. The DB is up-to-date with the signer keystores 
            2. The validators fee recipients are up-to-date with the DB
        3. Code to communicate to the validator and the signer:
            1. getTruth(): Will retrieve the pubkeys from the signer and the fee recipients from the validators
            2. postTruth(): Will update the DB with the pubkeys that are in the signer and will update the validator fee recipients with the ones that are in the DB
            3. readFromDB(): Will read the values from the JSON file
            4. writeToDB(): Will write values to the JSON file
3. Truth sources:
    1. Signer will have the truth about the keystores
    2. The validator will have the truth about the fee recipients (although the Staking Brain will try to ensure the fee recipients stored in the DB are set in the validator)
    3. The Staking Brain (or dappmanager?) will know which tags (Obol, RocketPool, DIVA, SoloStaker…) are related to each fee recipient
4. Migrations:
    1. Get pubkeys from signer
    2. Get fee recipients from the validator (if it does not exist… MEV Smoothing Pool fee recipient? We could create a globalEnv with a default fee recipient if we do not have the MEVSP yet)
    3. Default tag “soloStaker”
    4. Write to DB
