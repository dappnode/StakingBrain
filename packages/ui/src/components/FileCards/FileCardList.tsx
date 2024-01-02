import {
  Card,
  Box,
  Typography,
  TextField,
  MenuItem,
  Select,
  FormControl,
  FormHelperText,
} from "@mui/material";
import { KeystoreInfo, TagSelectOption } from "../../types";
import CloseIcon from "@mui/icons-material/Close";
import "./FileCardList.css";
import {
  Tag,
  shortenPubkey,
  isFeeRecipientEditable,
  Network,
} from "@stakingbrain/common";
import JoinSmoothBox from "../JoinSmoothBox/JoinSmoothBox";

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
  isSoloTag: boolean[],
  setIsSoloTag: (isSoloTag: boolean[]) => void,
  willJoinSmooth: boolean[],
  setWillJoinSmooth: (willJoinSmooth: boolean[]) => void,

  network: Network,
  networkAllowsSmooth: (network: Network) => boolean
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
                      const newFeeRecipients = [...feeRecipients];
                      newFeeRecipients[index] = "";
                      const newWillJoinSmooth = [...willJoinSmooth];
                      const newIsSolotag = [...isSoloTag];
                      if (option.value === "solo") {
                        newIsSolotag[index] = true;
                      } else {
                        newIsSolotag[index] = false;
                        newWillJoinSmooth[index] = false;
                        setFeeRecipients(newFeeRecipients);
                      }
                      setIsSoloTag([...newIsSolotag]);
                      setWillJoinSmooth([...newWillJoinSmooth]);
                    }}
                  >
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
              <FormHelperText>Staking protocol</FormHelperText>
            </>
          )}
          {!useSameFeeRecipient && (
            <>
              {isSoloTag[index] && networkAllowsSmooth(network) && (
                <JoinSmoothBox
                  network={network}
                  willJoinSmooth={willJoinSmooth}
                  setWillJoinSmooth={setWillJoinSmooth}
                  index={index}
                  feeRecipients={feeRecipients}
                  setFeeRecipients={setFeeRecipients}
                />
              )}
              <TextField
                value={feeRecipients[index]}
                id={`outlined-fee-recipient-input-${index}`}
                label={
                  tags[index] === undefined ||
                  isFeeRecipientEditable(tags[index])
                    ? willJoinSmooth[index] && isSoloTag[index]
                      ? null
                      : "Fee Recipient"
                    : "For this protocol, fee recipient will be set automatically"
                }
                type="text"
                sx={{ marginTop: 2 }}
                onChange={(event) => {
                  const newFeeRecipients = [...feeRecipients];
                  newFeeRecipients[index] = event.target.value;
                  setFeeRecipients([...newFeeRecipients]);
                }}
                error={
                  willJoinSmooth[index]
                    ? false
                    : isFeeRecipientFieldWrong(index)
                }
                helperText={getFeeRecipientFieldHelperText(index)}
                disabled={
                  !isFeeRecipientEditable(tags[index]) || willJoinSmooth[index]
                }
              />
            </>
          )}
        </FormControl>
      )}
    </Card>
  ));
}
