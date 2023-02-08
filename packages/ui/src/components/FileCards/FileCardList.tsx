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
import { KeystoreInfo } from "../../types";
import CloseIcon from "@mui/icons-material/Close";
import { shortenPubkey } from "../../logic/Utils/dataUtils";
import "./FileCardList.css";
import { Tag } from "@stakingbrain/common";

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
  useSameFeeRecipient: boolean
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
    <Card key={index} raised sx={{ padding: 2, marginTop: 4, borderRadius: 3 }}>
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
            <>
              <TextField
                id={`outlined-password-input-${index}`}
                label="Keystore Password"
                type="password"
                sx={{ marginTop: 2 }}
                onChange={(event) => {
                  passwords[index] = event.target.value;
                }}
              />
              <FormHelperText>
                Password to decrypt the keystore(s)
              </FormHelperText>
            </>
          )}
          {!useSameFeeRecipient && (
            <>
              <TextField
                id={`outlined-fee-recipient-input-${index}`}
                label="Fee Recipient"
                type="text"
                sx={{ marginTop: 2 }}
                onChange={(event) => {
                  feeRecipients[index] = event.target.value;
                }}
              />
              <FormHelperText>
                The address you wish to receive the transaction fees
              </FormHelperText>
            </>
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
                  tags[index] = event.target.value as Tag;
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
        </FormControl>
      )}
    </Card>
  ));
}
