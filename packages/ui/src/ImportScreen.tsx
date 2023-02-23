import FileDrop from "./components/FileDrop/FileDrop";
import { SecondaryInfoTypography } from "./Styles/Typographies";
import {
  Box,
  Button,
  Card,
  Switch,
  TextField,
  Select,
  Typography,
  FormGroup,
  FormControlLabel,
  MenuItem,
  FormControl,
  FormHelperText,
} from "@mui/material";
import { Link } from "react-router-dom";
import { DropEvent } from "react-dropzone";
import { useState } from "react";
import BackupIcon from "@mui/icons-material/Backup";
import { ImportStatus, KeystoreInfo } from "./types";
import FileCardList from "./components/FileCards/FileCardList";
import ImportDialog from "./components/Dialogs/ImportDialog";
import {
  Web3signerPostResponse,
  Tag,
  isValidEcdsaPubkey,
  burnAddress,
  CustomImportRequest,
  editableFeeRecipientTags,
} from "@stakingbrain/common";
import CloseIcon from "@mui/icons-material/Close";
import { api } from "./api";
import ArrowCircleLeftOutlinedIcon from "@mui/icons-material/ArrowCircleLeftOutlined";
import { extractPubkey } from "./utils/dataUtils";

export default function ImportScreen(): JSX.Element {
  const [keystoresPostResponse, setKeystoresPostResponse] =
    useState<Web3signerPostResponse>();
  const [keystoresPostError, setKeystoresPostError] = useState<string>();
  const [openDialog, setOpenDialog] = useState(false);
  const [acceptedFiles, setAcceptedFiles] = useState<KeystoreInfo[]>([]);
  const [passwords, setPasswords] = useState<string[]>([]);
  const [useSamePassword, setUseSamePassword] = useState(false);
  const [tags, setTags] = useState<Tag[]>([]);
  const [useSameTag, setUseSameTag] = useState(false);
  const [feeRecipients, setFeeRecipients] = useState<string[]>([]);
  const [useSameFeerecipient, setUseSameFeerecipient] = useState(false);
  const [importStatus, setImportStatus] = useState(ImportStatus.NotImported);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const keystoreFilesCallback = async (files: File[], event: DropEvent) => {
    const keystoresToAdd: KeystoreInfo[] = [];
    const passwordsToAdd: string[] = [];
    for (const file of files) {
      const pubkey = await extractPubkey(file);
      if (pubkey) {
        if (acceptedFiles.some((e) => e.pubkey === pubkey) === false) {
          keystoresToAdd.push({ file: file, pubkey: pubkey });
          passwordsToAdd.push("");
        }
      }
    }
    setAcceptedFiles([...acceptedFiles].concat(keystoresToAdd));
    setPasswords([...passwords].concat(passwordsToAdd));
  };

  const [slashingFile, setSlashingFile] = useState<File>();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const slashingFilesCallback = (files: File[], event: DropEvent) => {
    setSlashingFile(files[0]);
  };

  // SLASHING PROTECTION SWITCH
  const [slashingProtectionIncluded, setSlashingProtectionIncluded] =
    useState(true);
  const onSlashingChecked = (
    event: React.ChangeEvent<HTMLInputElement>,
    checked: boolean
  ) => {
    setSlashingProtectionIncluded(checked);
  };

  const handleClickOpenDialog = () => {
    setOpenDialog(true);
  };

  async function importKeystores() {
    try {
      setImportStatus(ImportStatus.Importing);
      handleClickOpenDialog();

      const importRequest: CustomImportRequest = {
        importFrom: "ui",
        slashing_protection: slashingFile,
        validatorsImportRequest: acceptedFiles.map((f, i) => {
          return {
            keystore: f.file,
            password: passwords[i],
            tag: tags[i],
            feeRecipient: feeRecipients[i],
          };
        }),
      };

      const response = await api.importValidators(importRequest);

      setKeystoresPostResponse(response);
      setKeystoresPostError(undefined);
      setImportStatus(ImportStatus.Imported);
    } catch (e) {
      console.error(e);
      setKeystoresPostError(e.message);
      setImportStatus(ImportStatus.NotImported);
    }
  }

  function getFeeRecipientFieldHelperText(index: number): string {
    const feeRecipient = feeRecipients[index];

    if (feeRecipient === "" || feeRecipient === undefined) {
      return "The address you wish to receive the transaction fees";
    }
    if (!isValidEcdsaPubkey(feeRecipient)) {
      return "Invalid address";
    }
    if (feeRecipient === burnAddress) {
      return "It is not possible to set the fee recipient to the burn address";
    }
    return "Address is valid";
  }

  function isFeeRecipientFieldWrong(index: number): boolean {
    const feeRecipient = feeRecipients[index];

    if (feeRecipient === "" || feeRecipient === undefined) {
      return false;
    }
    if (!isValidEcdsaPubkey(feeRecipient) || feeRecipient === burnAddress) {
      return true;
    }

    return false;
  }

  return (
    <div>
      <Box
        sx={{
          margin: 8,
          display: "flex",
          flexDirection: "column",
          alignItems: "left",
        }}
      >
        <Card
          sx={{
            padding: 4,
            borderRadius: 2,
          }}
        >
          <Typography
            variant="h5"
            sx={{
              marginBottom: 4,
            }}
          >
            <b>Import Validator Keystore(s)</b>
          </Typography>
          <Typography>Upload any keystore JSON file(s).</Typography>

          <SecondaryInfoTypography
            sx={{ marginBottom: 4 }}
            text="Keystores files are usually named keystore-xxxxxxxx.json and were
                created in the Ethereum launchpad deposit CLI. Do not upload the
                deposit_data.json file."
          />
          <FileDrop callback={keystoreFilesCallback} />

          <SecondaryInfoTypography
            sx={{ marginBottom: 2, marginTop: 4 }}
            text="Remember you need to introduce the password you set during
                creation of the keystore files."
          />

          {acceptedFiles.length > 1 && (
            <>
              <FormGroup sx={{ marginTop: "6px" }}>
                <FormControlLabel
                  control={
                    <Switch
                      onChange={() => setUseSamePassword(!useSamePassword)}
                    />
                  }
                  label="Use same password for every file"
                />
                <FormControlLabel
                  control={
                    <Switch
                      onChange={() =>
                        setUseSameFeerecipient(!useSameFeerecipient)
                      }
                    />
                  }
                  label="Use same fee recipient for every file"
                />
                <FormControlLabel
                  control={
                    <Switch onChange={() => setUseSameTag(!useSameTag)} />
                  }
                  label="Use same tag for every file"
                />
              </FormGroup>
              {(useSameTag || useSameFeerecipient || useSamePassword) && (
                <FormControl sx={{ marginTop: 2, width: "100%" }}>
                  {useSamePassword && (
                    <>
                      <TextField
                        id={`outlined-password-input`}
                        label="Keystore Password"
                        type="password"
                        sx={{ marginTop: 2 }}
                        onChange={(e) =>
                          setPasswords(
                            Array(acceptedFiles.length).fill(e.target.value)
                          )
                        }
                        helperText={"Password to decrypt the keystore(s)"}
                      />
                    </>
                  )}
                  {useSameTag && (
                    <>
                      <Select
                        id="outlined-tag-input"
                        label="Tag"
                        value={tags[0]}
                        type="text"
                        sx={{ marginTop: 2 }}
                        onChange={(e) => {
                          setTags(
                            Array(acceptedFiles.length).fill(e.target.value)
                          );

                          if (
                            !editableFeeRecipientTags.some(
                              (tag) => tag === tags[0]
                            )
                          ) {
                            setFeeRecipients(
                              Array(acceptedFiles.length).fill("")
                            );
                          }
                        }}
                      >
                        <MenuItem value={"solo"}>Solo</MenuItem>
                        <MenuItem value={"rocketpool"}>Rocketpool</MenuItem>
                        <MenuItem value={"stakehouse"}>StakeHouse</MenuItem>
                        <MenuItem value={"stakewise"}>Stakewise</MenuItem>
                      </Select>
                      <FormHelperText>Staking protocol</FormHelperText>
                    </>
                  )}
                  {useSameFeerecipient && (
                    <>
                      <TextField
                        id={`outlined-fee-recipient-input`}
                        label={
                          tags[0] === undefined ||
                          editableFeeRecipientTags.some(
                            (tag) => tag === tags[0]
                          )
                            ? "Fee Recipient"
                            : "For this protocol, fee recipient will be set automatically"
                        }
                        type="text"
                        sx={{ marginTop: 2 }}
                        onChange={(e) => {
                          setFeeRecipients(
                            Array(acceptedFiles.length).fill(e.target.value)
                          );
                        }}
                        error={isFeeRecipientFieldWrong(0)}
                        helperText={getFeeRecipientFieldHelperText(0)}
                        value={feeRecipients[0]}
                        disabled={
                          !editableFeeRecipientTags.some(
                            (tag) => tag === tags[0]
                          )
                        }
                      />
                    </>
                  )}
                </FormControl>
              )}
            </>
          )}

          {FileCardList(
            acceptedFiles,
            setAcceptedFiles,
            passwords,
            setPasswords,
            useSamePassword,
            tags,
            setTags,
            useSameTag,
            feeRecipients,
            setFeeRecipients,
            useSameFeerecipient,
            getFeeRecipientFieldHelperText,
            isFeeRecipientFieldWrong
          )}

          <Box
            sx={{
              marginTop: 8,
              marginBottom: 2,
              display: "flex",
              flexDirection: "row",
              alignItems: "left",
            }}
          >
            <Typography variant="h5" sx={{ marginRight: 2 }}>
              <b>Import slashing protection data? (recommended)</b>
            </Typography>
            <Switch defaultChecked onChange={onSlashingChecked} />
          </Box>
          {slashingProtectionIncluded ? (
            <div>
              <Typography>
                Upload your slashing protection file to protect your
                keystore(s).
              </Typography>

              <SecondaryInfoTypography
                sx={{ marginBottom: 4 }}
                text="Only for previously-used keystores"
              />
              {slashingFile ? (
                <Card
                  key={slashingFile.name}
                  raised
                  sx={{
                    padding: 2,
                    marginTop: 4,
                    borderRadius: 2,
                  }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      flexDirection: "row",
                      alignItems: "left",
                      justifyContent: "space-between",
                    }}
                  >
                    <Typography variant="h6">
                      <b>✅ {slashingFile.name}</b>
                      <br />
                    </Typography>

                    <button onClick={() => setSlashingFile(undefined)}>
                      <CloseIcon color="action" />
                    </button>
                  </Box>
                </Card>
              ) : (
                <FileDrop callback={slashingFilesCallback} />
              )}
            </div>
          ) : null}
        </Card>

        <Box
          sx={{
            marginTop: 4,
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <Link
            to={{ pathname: "/", search: window.location.search }}
            style={{ textDecoration: "none" }}
          >
            <Button
              variant="outlined"
              size="large"
              sx={{ marginRight: 4, borderRadius: 2 }}
              startIcon={<ArrowCircleLeftOutlinedIcon />}
            >
              Back to Accounts
            </Button>
          </Link>
          <Button
            variant="contained"
            size="large"
            endIcon={<BackupIcon />}
            disabled={
              acceptedFiles.length === 0 ||
              (!slashingFile && slashingProtectionIncluded) ||
              passwords.some((password) => password.length === 0) ||
              !feeRecipients.some((feeRecipient) =>
                isValidEcdsaPubkey(feeRecipient)
              ) ||
              tags.some((tag) => tag.length === 0)
            }
            onClick={importKeystores}
            sx={{ borderRadius: 3 }}
          >
            Submit Keystores
          </Button>
        </Box>
      </Box>
      <ImportDialog
        open={openDialog}
        setOpen={setOpenDialog}
        keystoresPostResponse={keystoresPostResponse}
        keystoresPostError={keystoresPostError}
        importStatus={importStatus}
        acceptedFiles={acceptedFiles}
      />
    </div>
  );
}
