import type { JSX } from "react";
import FileDrop from "./components/FileDrop/FileDrop";
import { SecondaryInfoTypography } from "./Styles/Typographies";
import {
  Box,
  Button,
  Card,
  Switch,
  TextField,
  Typography,
  FormGroup,
  FormControlLabel,
  MenuItem,
  FormControl,
  Alert,
  Chip,
  IconButton,
  Stack
} from "@mui/material";
import { Link } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import BackupIcon from "@mui/icons-material/Backup";
import { ImportStatus, KeystoreInfo, TagSelectOption } from "./types";
import FileCardList from "./components/FileCards/FileCardList";
import ImportDialog from "./components/Dialogs/ImportDialog";
import { Tag, isValidEcdsaPubkey, BURN_ADDRESS, isFeeRecipientEditable, Network } from "@stakingbrain/common";
import CloseIcon from "@mui/icons-material/Close";
import { rpcClient } from "./socket";
import ArrowCircleLeftOutlinedIcon from "@mui/icons-material/ArrowCircleLeftOutlined";
import { extractPubkey } from "./utils/dataUtils";
import { createImportRequest } from "./utils/createImportRequest";
import { appendImportFiles, incompleteImportIndexes, isImportFormValid, ImportFormState } from "./utils/importForm";
import PageLayout, { PageHeader } from "./components/Layout/PageLayout";
import { ImportProgress, ImportResult, notAttempted, planImportBatches, runImportBatches } from "./utils/importBatches";

// Each card holds up to three inputs; rendering hundreds at once makes typing laggy.
const FILE_CARDS_PAGE = 25;

export default function ImportScreen({
  network,
  isMevBoostSet
}: {
  network: Network;
  isMevBoostSet: boolean;
}): JSX.Element {
  const [importResults, setImportResults] = useState<ImportResult[]>();
  const [importProgress, setImportProgress] = useState<ImportProgress>();
  const [importStopped, setImportStopped] = useState<"user" | "error">();
  const [stopRequested, setStopRequested] = useState(false);
  const stopRef = useRef(false);
  const [keystoresPostError, setKeystoresPostError] = useState<string>();
  const [openDialog, setOpenDialog] = useState(false);
  const [importForm, setImportForm] = useState<ImportFormState>({
    acceptedFiles: [],
    passwords: [],
    tags: [],
    feeRecipients: []
  });
  const { acceptedFiles, passwords, tags, feeRecipients } = importForm;
  const setAcceptedFiles = (acceptedFiles: KeystoreInfo[]) =>
    setImportForm((current) => ({ ...current, acceptedFiles }));
  const setPasswords = (passwords: string[]) => setImportForm((current) => ({ ...current, passwords }));
  const setTags = (tags: ImportFormState["tags"]) => setImportForm((current) => ({ ...current, tags }));
  const setFeeRecipients = (feeRecipients: string[]) => setImportForm((current) => ({ ...current, feeRecipients }));
  const [fileError, setFileError] = useState("");
  const [useSamePassword, setUseSamePassword] = useState(false);
  const [useSameTag, setUseSameTag] = useState(false);
  const [useSameFeerecipient, setUseSameFeerecipient] = useState(false);
  const [importStatus, setImportStatus] = useState(ImportStatus.NotImported);
  const [slashingFile, setSlashingFile] = useState<File>();
  const [showMevWarning, setShowMevWarning] = useState(false);
  const [isButtonDisabled, setIsButtonDisabled] = useState(true);
  const [visibleFiles, setVisibleFiles] = useState(FILE_CARDS_PAGE);
  const incomplete = incompleteImportIndexes(importForm);

  // If the user has selected the 'lido' tag and MEV-Boost is not set, show the warning
  useEffect(() => {
    const lidoSelected = tags.includes("lido");
    setShowMevWarning(lidoSelected && !isMevBoostSet);
  }, [tags, isMevBoostSet]);

  // Function to handle "use same password/fee recipient/tag" switches toggling
  const handleSwitchToggle = (switchType: "password" | "tag" | "feerecipient") => {
    switch (switchType) {
      case "password":
        setUseSamePassword(!useSamePassword); // Directly toggle the boolean state
        if (!useSamePassword) setPasswords(Array(acceptedFiles.length).fill(passwords[0] ?? ""));
        break;
      case "tag":
        setUseSameTag(!useSameTag); // Directly toggle the boolean state
        if (!useSameTag) {
          setTags(Array(acceptedFiles.length).fill(tags[0] ?? ""));
          if (tags[0] && !isFeeRecipientEditable(tags[0])) setFeeRecipients(Array(acceptedFiles.length).fill(""));
        }
        break;
      case "feerecipient":
        setUseSameFeerecipient(!useSameFeerecipient); // Directly toggle the boolean state
        if (!useSameFeerecipient) setFeeRecipients(Array(acceptedFiles.length).fill(feeRecipients[0] ?? ""));
        break;
    }
  };

  const keystoreFilesCallback = async (files: File[]) => {
    const keystoresToAdd: KeystoreInfo[] = [];
    const rejected: string[] = [];
    for (const file of files) {
      try {
        keystoresToAdd.push({ file, pubkey: await extractPubkey(file) });
      } catch {
        rejected.push(file.name);
      }
    }
    setFileError(rejected.length ? `Could not read valid validator keystores from: ${rejected.join(", ")}` : "");
    setImportForm((current) =>
      appendImportFiles(current, keystoresToAdd, {
        password: useSamePassword,
        tag: useSameTag,
        feeRecipient: useSameFeerecipient
      })
    );
  };

  const slashingFilesCallback = (files: File[]) => {
    setSlashingFile(files[0]);
  };

  // SLASHING PROTECTION SWITCH
  const [slashingProtectionIncluded, setSlashingProtectionIncluded] = useState(true);
  const onSlashingChecked = (event: React.ChangeEvent<HTMLInputElement>, checked: boolean) => {
    setSlashingProtectionIncluded(checked);
  };

  const handleClickOpenDialog = () => {
    setOpenDialog(true);
  };

  // This useEffect updates the "submit keystores" button state based on various conditions,
  // such as if any password is empty, if any tag is empty, if any fee recipient is invalid, etc.
  useEffect(() => {
    const disable =
      acceptedFiles.length === 0 ||
      (!slashingFile && slashingProtectionIncluded) ||
      !isImportFormValid(importForm) ||
      showMevWarning;

    setIsButtonDisabled(disable); // Set the state based on the conditions
  }, [passwords, tags, feeRecipients, acceptedFiles, slashingFile, slashingProtectionIncluded, showMevWarning]);

  /** Import in batches with live progress. `only` retries a subset while keeping earlier results. */
  async function importKeystores(only?: number[]) {
    try {
      setImportStatus(ImportStatus.Importing);
      setKeystoresPostError(undefined);
      setImportStopped(undefined);
      stopRef.current = false;
      setStopRequested(false);
      if (!only) {
        setImportResults(undefined);
        setImportProgress(undefined);
      }
      handleClickOpenDialog();

      const importRequest = await createImportRequest({
        acceptedFiles,
        passwords,
        tags,
        feeRecipients,
        slashingFile: slashingProtectionIncluded ? slashingFile : undefined
      });
      const batches = planImportBatches(
        importRequest,
        acceptedFiles.map(({ pubkey }) => pubkey),
        { only }
      );
      const { results, stopped } = await runImportBatches({
        batches,
        results: (only && importResults) || acceptedFiles.map(notAttempted),
        importBatch: (request) => rpcClient.call("importValidators", request),
        onProgress: (progress, results) => {
          setImportProgress(progress);
          setImportResults(results);
        },
        shouldStop: () => stopRef.current
      });

      setImportResults(results);
      setImportStopped(stopped);
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
    if (feeRecipient === BURN_ADDRESS) {
      return "It is not possible to set the fee recipient to the burn address";
    }
    return "Address is valid";
  }

  function isFeeRecipientFieldWrong(index: number): boolean {
    const feeRecipient = feeRecipients[index];

    if (feeRecipient === "" || feeRecipient === undefined) {
      return false;
    }
    if (!isValidEcdsaPubkey(feeRecipient) || feeRecipient === BURN_ADDRESS) {
      return true;
    }

    return false;
  }

  const tagSelectOptions: TagSelectOption[] = ["gnosis", "lukso"].includes(network)
    ? [{ value: "solo", label: "Solo" }]
    : network === "hoodi"
      ? [
          { value: "solo", label: "Solo" },
          { value: "rocketpool", label: "Rocketpool" },
          { value: "stakehouse", label: "StakeHouse" },
          { value: "lido", label: "Lido" }
        ]
      : [
          { value: "solo", label: "Solo" },
          { value: "rocketpool", label: "Rocketpool" },
          { value: "stakehouse", label: "StakeHouse" },
          { value: "stakewise", label: "Stakewise" },
          { value: "stader", label: "Stader" },
          { value: "lido", label: "Lido" }
        ];

  return (
    <PageLayout maxWidth={960}>
      <PageHeader
        title="Import validators"
        subtitle="Upload keystores and slashing protection data."
        icon={<BackupIcon />}
      />
      <Card
        sx={{
          padding: { xs: 2, sm: 3 }
        }}
      >
        <Typography variant="subtitle1" sx={{ mb: 0.5 }}>
          Keystore files
        </Typography>

        <SecondaryInfoTypography
          sx={{ marginBottom: 2.5 }}
          text="Upload keystore-xxxxxxxx.json files from the deposit CLI. Do not upload deposit_data.json."
        />
        <FileDrop callback={keystoreFilesCallback} />
        {fileError && (
          <Alert severity="error" sx={{ marginTop: 2 }}>
            {fileError}
          </Alert>
        )}

        <SecondaryInfoTypography sx={{ marginTop: 2 }} text="Have the password used to create each keystore ready." />
      </Card>

      {acceptedFiles.length > 0 &&
        (acceptedFiles.length > 1 || useSameTag || useSamePassword || useSameFeerecipient) && (
          <Card sx={{ p: { xs: 2, sm: 3 } }}>
            <Typography variant="subtitle1" sx={{ mb: 1 }}>
              Shared settings
            </Typography>
            <FormGroup>
              <FormControlLabel
                control={<Switch checked={useSamePassword} onChange={() => handleSwitchToggle("password")} />}
                label="Use same password for every file"
              />
              <FormControlLabel
                control={<Switch checked={useSameFeerecipient} onChange={() => handleSwitchToggle("feerecipient")} />}
                label="Use same fee recipient for every file"
              />
              <FormControlLabel
                control={<Switch checked={useSameTag} onChange={() => handleSwitchToggle("tag")} />}
                label="Use same tag for every file"
              />
            </FormGroup>
            {(useSameTag || useSameFeerecipient || useSamePassword) && (
              <FormControl sx={{ marginTop: 2, width: "100%" }}>
                {useSamePassword && (
                  <>
                    <TextField
                      id={`outlined-password-input`}
                      label="Keystore password"
                      type="password"
                      value={passwords[0] ?? ""}
                      sx={{ marginTop: 2 }}
                      onChange={(e) => setPasswords(Array(acceptedFiles.length).fill(e.target.value))}
                      helperText={"Password to decrypt the keystore(s)"}
                    />
                  </>
                )}
                {useSameTag && (
                  <>
                    <TextField
                      select
                      id="shared-staking-protocol"
                      label="Staking protocol"
                      value={tags[0] ?? ""}
                      type="text"
                      sx={{ marginTop: 2 }}
                      onChange={(e) => {
                        setTags(Array(acceptedFiles.length).fill(e.target.value as Tag));
                        if (!isFeeRecipientEditable(e.target.value as Tag)) {
                          setFeeRecipients(Array(acceptedFiles.length).fill(""));
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
                {useSameFeerecipient && (
                  <>
                    <TextField
                      id={`outlined-fee-recipient-input`}
                      label={
                        tags.some((tag) => !tag || isFeeRecipientEditable(tag))
                          ? "Fee recipient"
                          : "Fee recipient set by protocol"
                      }
                      type="text"
                      sx={{ marginTop: 2 }}
                      onChange={(e) => {
                        setFeeRecipients(Array(acceptedFiles.length).fill(e.target.value));
                      }}
                      error={isFeeRecipientFieldWrong(0)}
                      helperText={getFeeRecipientFieldHelperText(0)}
                      value={feeRecipients[0] ?? ""}
                      disabled={tags.every((tag) => tag && !isFeeRecipientEditable(tag))}
                    />
                    {tags.some((tag) => tag && !isFeeRecipientEditable(tag)) && !useSameTag && (
                      <Alert severity="info">This field will only apply to the editable fee recipients</Alert>
                    )}
                  </>
                )}
              </FormControl>
            )}
          </Card>
        )}

      {acceptedFiles.length > 1 && (
        <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2}>
          <Typography variant="subtitle1">{acceptedFiles.length} keystores selected</Typography>
          <Button
            size="small"
            color="inherit"
            onClick={() => {
              setImportForm({ acceptedFiles: [], passwords: [], tags: [], feeRecipients: [] });
              setVisibleFiles(FILE_CARDS_PAGE);
              setFileError("");
            }}
          >
            Remove all
          </Button>
        </Stack>
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
        isFeeRecipientFieldWrong,
        tagSelectOptions,
        visibleFiles
      )}

      {acceptedFiles.length > visibleFiles && (
        <Card sx={{ p: 2 }}>
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            spacing={2}
            useFlexGap
            flexWrap="wrap"
          >
            <Typography variant="body2" color="text.secondary">
              Showing {visibleFiles} of {acceptedFiles.length} keystores.
              {!(useSamePassword && useSameTag && useSameFeerecipient) &&
                " Hidden keystores still need their own values; turn on shared settings to fill them all at once."}
            </Typography>
            <Stack direction="row" spacing={1}>
              <Button size="small" onClick={() => setVisibleFiles(visibleFiles + FILE_CARDS_PAGE)}>
                Show {Math.min(FILE_CARDS_PAGE, acceptedFiles.length - visibleFiles)} more
              </Button>
              <Button size="small" onClick={() => setVisibleFiles(acceptedFiles.length)}>
                Show all
              </Button>
            </Stack>
          </Stack>
        </Card>
      )}

      <Card sx={{ p: { xs: 2, sm: 3 } }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2}>
          <Box>
            <Typography variant="subtitle1">Slashing protection</Typography>
            <Typography variant="body2" color="text.secondary">
              Recommended for previously used keystores.
            </Typography>
          </Box>
          <Switch
            checked={slashingProtectionIncluded}
            onChange={onSlashingChecked}
            slotProps={{ input: { "aria-label": "Import slashing protection data" } }}
          />
        </Stack>
        {slashingProtectionIncluded ? (
          <Box sx={{ mt: 2.5 }}>
            {slashingFile ? (
              <Card
                key={slashingFile.name}
                sx={{
                  padding: 2,
                  borderRadius: 2.5
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between"
                  }}
                >
                  <Typography variant="body2" fontWeight={600} sx={{ overflowWrap: "anywhere" }}>
                    {slashingFile.name}
                  </Typography>
                  <Chip size="small" color="success" variant="outlined" label="Ready" />

                  <IconButton
                    aria-label="Remove slashing protection file"
                    size="small"
                    onClick={() => setSlashingFile(undefined)}
                  >
                    <CloseIcon color="action" />
                  </IconButton>
                </Box>
              </Card>
            ) : (
              <FileDrop callback={slashingFilesCallback} />
            )}
          </Box>
        ) : null}
      </Card>
      {incomplete.length > 0 && acceptedFiles.length > 1 && (
        <Alert
          severity="info"
          action={
            incomplete[0] >= visibleFiles ? (
              <Button color="inherit" size="small" onClick={() => setVisibleFiles(incomplete[0] + 1)}>
                Show first
              </Button>
            ) : undefined
          }
        >
          {incomplete.length} of {acceptedFiles.length} keystores still need a password, protocol or valid fee recipient
          (first: #{incomplete[0] + 1}, {acceptedFiles[incomplete[0]]?.file.name}).
        </Alert>
      )}
      {showMevWarning && (
        <Alert
          severity="warning"
          sx={{
            marginTop: 4,
            display: "flex"
          }}
        >
          You are importing one or more "Lido" validators, but don't have the MEV Boost package up & running. As a Lido
          Node Operator, it is your responsibility to ensure that your validators use MEV boost. <br /> Please install
          the MEV Boost package from{" "}
          <Link to={network === "hoodi" ? "http://my.dappnode/stakers/hoodi" : "http://my.dappnode/stakers/ethereum"}>
            your stakers tab
          </Link>{" "}
          before importing your Lido validator. Visit{" "}
          <Link to="https://docs.dappnode.io/docs/user/staking/ethereum/lsd-pools/lido">our docs</Link> for more
          details.
        </Alert>
      )}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          gap: 2,
          flexWrap: "wrap"
        }}
      >
        <Button
          component={Link}
          to={{ pathname: "/", search: window.location.search }}
          size="medium"
          sx={{ borderRadius: 2 }}
          startIcon={<ArrowCircleLeftOutlinedIcon />}
        >
          Back to validators
        </Button>

        <Button
          variant="contained"
          size="medium"
          endIcon={<BackupIcon />}
          disabled={isButtonDisabled || importStatus === ImportStatus.Importing}
          onClick={() => importKeystores()}
          sx={{ borderRadius: 2 }}
        >
          Import validators
        </Button>
      </Box>
      <ImportDialog
        open={openDialog}
        setOpen={setOpenDialog}
        results={importResults}
        progress={importProgress}
        error={keystoresPostError}
        stopped={importStopped}
        stopRequested={stopRequested}
        importStatus={importStatus}
        acceptedFiles={acceptedFiles}
        onStop={() => {
          stopRef.current = true;
          setStopRequested(true);
        }}
        onRetry={(indexes) => importKeystores(indexes)}
      />
    </PageLayout>
  );
}
