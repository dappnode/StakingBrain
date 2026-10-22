import type { JSX } from "react";
import { Card, Box, Chip, IconButton, Typography, TextField, MenuItem, FormControl } from "@mui/material";
import { KeystoreInfo, TagSelectOption } from "../../types";
import CloseIcon from "@mui/icons-material/Close";
import { Tag, shortenPubkey, isFeeRecipientEditable } from "@stakingbrain/common";

export default function FileCardList(
  fileInfos: KeystoreInfo[],
  setAcceptedFiles: (passwords: KeystoreInfo[]) => void,
  passwords: string[],
  setPasswords: (passwords: string[]) => void,
  useSamePassword: boolean,
  tags: (Tag | "")[],
  setTags: (tags: (Tag | "")[]) => void,
  useSameTag: boolean,
  feeRecipients: string[],
  setFeeRecipients: (feeRecipients: string[]) => void,
  useSameFeeRecipient: boolean,
  getFeeRecipientFieldHelperText: (index: number) => string,
  isFeeRecipientFieldWrong: (index: number) => boolean,
  tagSelectOptions: TagSelectOption[]
): JSX.Element[] {
  const removeFileFromList = (
    fileInfo: KeystoreInfo,
    fileInfos: KeystoreInfo[],
    setAcceptedFiles: (passwords: KeystoreInfo[]) => void,
    passwords: string[],
    setPasswords: (passwords: string[]) => void,
    feeRecipients: string[],
    setFeeRecipients: (feeRecipients: string[]) => void,
    tags: (Tag | "")[],
    setTags: (tags: (Tag | "")[]) => void
  ) => {
    const indexToRemove = fileInfos.indexOf(fileInfo);
    setAcceptedFiles(fileInfos.filter((f, index) => index !== indexToRemove));
    setPasswords(passwords.filter((f, index) => index !== indexToRemove));
    setFeeRecipients(feeRecipients.filter((f, index) => index !== indexToRemove));
    setTags(tags.filter((f, index) => index !== indexToRemove));
  };

  return Array.from(fileInfos).map((fileInfo, index) => (
    <Card key={fileInfo.pubkey} sx={{ p: { xs: 2, sm: 3 } }}>
      <Box
        sx={{
          display: "flex",
          flexDirection: "row",
          alignItems: "flex-start",
          gap: 1
        }}
      >
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="subtitle1" sx={{ overflowWrap: "anywhere" }}>
            {fileInfo.file.name}
          </Typography>
          <Chip
            size="small"
            variant="outlined"
            label={shortenPubkey(fileInfo.pubkey)}
            sx={{ mt: 1, fontFamily: "monospace" }}
          />
        </Box>
        <IconButton
          size="small"
          aria-label={`Remove ${fileInfo.file.name}`}
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
        </IconButton>
      </Box>

      {(!useSameTag || !useSameFeeRecipient || !useSamePassword) && (
        <FormControl sx={{ marginTop: 2, width: "100%" }}>
          {!useSamePassword && (
            <TextField
              id={`outlined-password-input-${index}`}
              label="Keystore password"
              type="password"
              value={passwords[index] ?? ""}
              sx={{ marginTop: 2 }}
              onChange={(event) => {
                const newPasswords = [...passwords];
                newPasswords[index] = event.target.value;
                setPasswords(newPasswords);
              }}
              helperText="Password used to create this keystore."
            />
          )}
          {!useSameTag && (
            <>
              <TextField
                select
                id={`staking-protocol-${index}`}
                label="Staking protocol"
                value={tags[index] ?? ""}
                type="text"
                sx={{ marginTop: 2 }}
                onChange={(event) => {
                  const newTags = [...tags];
                  newTags[index] = event.target.value as Tag;
                  setTags(newTags);

                  if (!useSameFeeRecipient && !isFeeRecipientEditable(event.target.value as Tag)) {
                    const newFeeRecipients = [...feeRecipients];
                    newFeeRecipients[index] = "";
                    setFeeRecipients(newFeeRecipients);
                  }
                }}
              >
                {tagSelectOptions.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </TextField>
            </>
          )}
          {!useSameFeeRecipient && (
            <TextField
              id={`outlined-fee-recipient-input-${index}`}
              label={
                !tags[index] || isFeeRecipientEditable(tags[index]) ? "Fee recipient" : "Fee recipient set by protocol"
              }
              type="text"
              value={feeRecipients[index] ?? ""}
              sx={{ marginTop: 2 }}
              onChange={(event) => {
                const newFeeRecipients = [...feeRecipients];
                newFeeRecipients[index] = event.target.value;
                setFeeRecipients(newFeeRecipients);
              }}
              error={isFeeRecipientFieldWrong(index)}
              helperText={getFeeRecipientFieldHelperText(index)}
              disabled={!!tags[index] && !isFeeRecipientEditable(tags[index])}
            />
          )}
        </FormControl>
      )}
    </Card>
  ));
}
