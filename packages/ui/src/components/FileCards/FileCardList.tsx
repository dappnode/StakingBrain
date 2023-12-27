import {
  Card,
  Box,
  Typography,
  TextField,
  MenuItem,
  Select,
  FormControl,
  FormHelperText,
  Switch,
} from "@mui/material";
import { KeystoreInfo, TagSelectOption } from "../../types";
import CloseIcon from "@mui/icons-material/Close";
import "./FileCardList.css";
import {
  Tag,
  shortenPubkey,
  isFeeRecipientEditable,
  smoothFeeRecipient,
  Network,
} from "@stakingbrain/common";
import { useEffect } from "react";
// import { smoothFeeRecipient } from "../../params";

export default function FileCardList(
  fileInfos: KeystoreInfo[],
  setAcceptedFiles: (passwords: KeystoreInfo[]) => void,
  passwords: string[],
  setPasswords: (passwords: string[]) => void,
  useSamePassword: boolean,
  tags: Tag[],
  setTags: (tags: Tag[]) => void,
  useSameTag: boolean,
  feeRecipients: string[],
  setFeeRecipients: (feeRecipients: string[]) => void,
  useSameFeeRecipient: boolean,
  getFeeRecipientFieldHelperText: (index: number) => string,
  isFeeRecipientFieldWrong: (index: number) => boolean,
  tagSelectOptions: TagSelectOption[],
  isSoloTag: boolean,
  setIsSoloTag: (isSoloTag: boolean) => void,
  willJoinSmooth: boolean,
  setWillJoinSmooth: (willJoinSmooth: boolean) => void,
  inputFeeRecipientValue: string,
  setInputFeeRecipientValue: (inputFeeRecipientValue: string) => void,
  network: Network
): JSX.Element[] {
  const removeFileFromList = (
    fileInfo: KeystoreInfo,
    fileInfos: KeystoreInfo[],
    setAcceptedFiles: (passwords: KeystoreInfo[]) => void,
    passwords: string[],
    setPasswords: (passwords: string[]) => void,
    feeRecipients: string[],
    setFeeRecipients: (feeRecipients: string[]) => void,
    tags: Tag[],
    setTags: (tags: Tag[]) => void
  ) => {
    const indexToRemove = fileInfos.indexOf(fileInfo);
    setAcceptedFiles(fileInfos.filter((f, index) => index !== indexToRemove));
    setPasswords(passwords.filter((f, index) => index !== indexToRemove));
    setFeeRecipients(
      feeRecipients.filter((f, index) => index !== indexToRemove)
    );
    setTags(tags.filter((f, index) => index !== indexToRemove));
  };

  const networkAllowsSmooth = (network: Network): boolean =>
    network === "mainnet" ? true : network === "prater" ? true : false;

  useEffect(() => {
    console.log(inputFeeRecipientValue);
  }, [inputFeeRecipientValue]);

  return Array.from(fileInfos).map((fileInfo, index) => (
    <Card key={index} raised sx={{ padding: 2, marginTop: 4, borderRadius: 2 }}>
      <Box
        sx={{
          display: "flex",
          flexDirection: "row",
          alignItems: "left",
        }}
      >
        <Typography variant="h6" sx={{ flex: 1 }}>
          <b>✅ {fileInfo.file.name}</b> - {shortenPubkey(fileInfo.pubkey)}
        </Typography>
        <button
          onClick={() =>
            removeFileFromList(
              fileInfo,
              fileInfos,
              setAcceptedFiles,
              passwords,
              setPasswords,
              feeRecipients,
              setFeeRecipients,
              tags,
              setTags
            )
          }
        >
          <CloseIcon color="action" />
        </button>
      </Box>

      {(!useSameTag || !useSameFeeRecipient || !useSamePassword) && (
        <FormControl sx={{ marginTop: 2, width: "100%" }}>
          {!useSamePassword && (
            <TextField
              id={`outlined-password-input-${index}`}
              label="Keystore Password"
              type="password"
              sx={{ marginTop: 2 }}
              onChange={(event) => {
                const newPasswords = [...passwords];
                newPasswords[index] = event.target.value;
                setPasswords(newPasswords);
              }}
              helperText={"Password to decrypt the keystore(s)"}
            />
          )}
          {!useSameTag && (
            <>
              <Select
                id="outlined-tag-input"
                label="Tag"
                value={tags[index]}
                type="text"
                sx={{ marginTop: 2 }}
                onChange={(event) => {
                  const newTags = [...tags];
                  newTags[index] = event.target.value as Tag;
                  setTags(newTags);

                  if (!isFeeRecipientEditable(event.target.value as Tag)) {
                    const newFeeRecipients = [...feeRecipients];
                    newFeeRecipients[index] = "";
                    setFeeRecipients(newFeeRecipients);
                  }
                }}
              >
                {tagSelectOptions.map((option) => (
                  <MenuItem
                    key={option.value}
                    value={option.value}
                    onClick={() => {
                      willJoinSmooth && option.value !== "solo"
                        ? setWillJoinSmooth(false)
                        : null;
                      option.value === "solo"
                        ? setIsSoloTag(true)
                        : setIsSoloTag(false);
                    }}
                  >
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
              <FormHelperText>Staking protocol</FormHelperText>
              {isSoloTag && networkAllowsSmooth(network) ? (
                <>
                  <Box
                    sx={{
                      marginY: 2,
                      display: "flex",
                      flexDirection: "row",
                      alignItems: "center",
                    }}
                  >
                    <Switch
                      onChange={(e) => {
                        setWillJoinSmooth(e.target.checked ? true : false);
                        console.log(smoothFeeRecipient);
                        setInputFeeRecipientValue(
                          e.target.checked ? smoothFeeRecipient(network) : ""
                        );
                      }}
                    />
                    <Typography
                      variant="subtitle1"
                      sx={{
                        marginTop: 1,
                        color: willJoinSmooth ? "black" : "gray",
                      }}
                    >
                      <b>
                        {willJoinSmooth
                          ? "I'm joining DAppNode Smooth!"
                          : "I want to join DAppNode Smooth!"}
                      </b>
                    </Typography>
                  </Box>

                  {willJoinSmooth ? (
                    <Box
                      sx={{
                        display: "flex",
                        flexDirection: "column",
                        marginLeft: 1,
                        marginBottom: 2,
                        padding: 2,
                        backgroundColor: "#fff8e6",
                        borderLeft: "5px solid #e6a700",
                        borderRadius: 2,
                        width: "50%",
                      }}
                    >
                      <Typography variant="subtitle1">
                        <b>CAUTION</b>
                      </Typography>

                      <Typography variant="subtitle1">
                        <ul>
                          <li>
                            By checking this option you acknowledge having read
                            and understood the{" "}
                            <a
                              target="_blank"
                              href="https://docs.dappnode.io/docs/smooth"
                            >
                              <b>Smooth Documentation.</b>
                            </a>
                          </li>
                          <li>
                            {" "}
                            This way you will be subscribed to the Smoothing
                            Pool once you propose a block.
                          </li>
                          <li>
                            If you ever want to change the fee of this
                            validator, make sure that you have first unsuscribed
                            from the Smoothing Pool in order to not be banned
                            from it!
                          </li>
                        </ul>
                      </Typography>
                    </Box>
                  ) : (
                    <></>
                  )}
                </>
              ) : (
                <></>
              )}
            </>
          )}
          {!useSameFeeRecipient && (
            <TextField
              value={inputFeeRecipientValue}
              id={`outlined-fee-recipient-input-${index}`}
              label={
                tags[index] === undefined || isFeeRecipientEditable(tags[index])
                  ? willJoinSmooth
                    ? "DAppNode Smooth Fee Recipient"
                    : "Fee Recipient"
                  : "For this protocol, fee recipient will be set automatically"
              }
              type="text"
              sx={{ marginTop: 2 }}
              onChange={(event) => {
                console.log(event.target.value);
                setInputFeeRecipientValue(event.target.value);
                const newFeeRecipients = [...feeRecipients];
                newFeeRecipients[index] = event.target.value;
                setFeeRecipients(newFeeRecipients);
              }}
              error={isFeeRecipientFieldWrong(index)}
              helperText={getFeeRecipientFieldHelperText(index)}
              disabled={!isFeeRecipientEditable(tags[index]) || willJoinSmooth}
            />
          )}
        </FormControl>
      )}
    </Card>
  ));
}
