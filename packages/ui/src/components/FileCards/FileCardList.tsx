import {
  Card,
  Box,
  Typography,
  TextField,
  MenuItem,
  Select,
} from "@mui/material";
import { KeystoreInfo } from "../../types";
import CloseIcon from "@mui/icons-material/Close";
import { shortenPubkey } from "../../logic/Utils/dataUtils";
import "./FileCardList.css";

const removeFileFromList = (
  fileInfo: KeystoreInfo,
  fileInfos: KeystoreInfo[],
  setAcceptedFiles: (passwords: KeystoreInfo[]) => void,
  passwords: string[],
  setPasswords: (passwords: string[]) => void
) => {
  const indexToRemove = fileInfos.indexOf(fileInfo);
  setAcceptedFiles(fileInfos.filter((f, index) => index !== indexToRemove));
  setPasswords(passwords.filter((f, index) => index !== indexToRemove));
};

export default function FileCardList(
  fileInfos: KeystoreInfo[],
  setAcceptedFiles: (passwords: KeystoreInfo[]) => void,
  passwords: string[],
  setPasswords: (passwords: string[]) => void,
  useSamePassword: boolean,
  tags: string[],
  setTags: (tags: string[]) => void,
  useSameTag: boolean,
  feeRecipients: string[],
  setFeeRecipients: (feeRecipients: string[]) => void,
  useSameFeeRecipient: boolean
): JSX.Element[] {
  return Array.from(fileInfos).map((fileInfo, index) => (
    <Card
      key={index}
      raised
      sx={{ padding: 2, marginTop: 4, width: "80%", borderRadius: 3 }}
    >
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
              setPasswords
            )
          }
        >
          <CloseIcon color="action" />
        </button>
      </Box>
      {!useSamePassword && (
        <TextField
          id={`outlined-password-input-${index}`}
          label="Keystore Password"
          type="password"
          onChange={(event) => setPasswords([...passwords, event.target.value])}
          sx={{ marginTop: 2, width: "60%" }}
        />
      )}
      {!useSameFeeRecipient && (
        <TextField
          id={`outlined-fee-recipient-input-${index}`}
          label="Fee Recipient"
          type="text"
          onChange={(event) =>
            setFeeRecipients([...feeRecipients, event.target.value])
          }
          sx={{ marginTop: 2, width: "60%" }}
        />
      )}
      {!useSameTag && (
        <Select
          id="outlined-tag-input"
          label="Tag"
          onChange={(event) => setTags([...tags, event.target.value])}
          sx={{ marginTop: 2, width: "60%" }}
        >
          <MenuItem value={"solo"}>Solo</MenuItem>
          <MenuItem value={"rocketpool"}>Rocketpool</MenuItem>
          <MenuItem value={"stakehouse"}>StakeHouse</MenuItem>
        </Select>
      )}
    </Card>
  ));
}
