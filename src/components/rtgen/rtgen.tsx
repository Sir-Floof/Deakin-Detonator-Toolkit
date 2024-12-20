import { useState, useEffect, useCallback } from "react";
import { Button, Stack, TextInput, Checkbox } from "@mantine/core";
import { useForm } from "@mantine/form";
import { CommandHelper } from "../../utils/CommandHelper";
import ConsoleWrapper from "../ConsoleWrapper/ConsoleWrapper";
import { RenderComponent } from "../UserGuide/UserGuide";
import InstallationModal from "../InstallationModal/InstallationModal";
import { LoadingOverlayAndCancelButton } from "../OverlayAndCancelButton/OverlayAndCancelButton";
import { checkAllCommandsAvailability } from "../../utils/CommandAvailability";
//import { SaveOutputToTextFile_v2 } from "../SaveOutputToFile/SaveOutputToTextFile";

/**
 * Represents the form values for the Rtgen component.
 */
interface FormValuesType {
    hashAlgorithm: string; // <hash_algorithm>
    charset: string; // <charset>
    plaintextLengthMin: string; // <plaintext_length_min>
    plaintextLengthMax: string; // <plaintext_length_max>
    tableIndex: string; // <table_index>
    chainLength: string; // <chain_length>
    chainCount: string; // <chain_count>
    partIndex: string; // <part_index>
}

/**
 * The Rtgen component.
 * @returns The Rtgen component.
 */
const Rtgen = () => {
    // Component state variables
    const [loading, setLoading] = useState(false); // State variable to indicate loading state
    const [output, setOutput] = useState(""); // State variable to store the output of the command execution
    const [allowSave, setAllowSave] = useState(false); // State variable to allow saving of output
    const [hasSaved, setHasSaved] = useState(false); // State variable to indicate if output has been saved
    const [isCommandAvailable, setIsCommandAvailable] = useState(false); // State variable to check if the command is available.
    const [opened, setOpened] = useState(!isCommandAvailable); // State variable that indicates if the modal is opened.
    const [loadingModal, setLoadingModal] = useState(true); // State variable to indicate loading state of the modal.
    const [pid, setPid] = useState(""); // State variable to store the process ID of the command execution.

    // Component Constants
    const title = "Rtgen";
    const description =
        "Rtgen is a tool for generating rainbow tables. These tables can be used to perform fast hash lookups during password cracking operations.";
    const steps =
        "=== Required ===\n" +
        "Step 1: Input the character set used for plaintext generation (e.g., alphanumeric).\n" +
        "Step 2: Select the hash algorithm to use (e.g., MD5, SHA1).\n" +
        "Step 3: Specify the chain length for the rainbow table.\n" +
        "Step 4: Define the size of the rainbow table.\n" +
        "Step 5: Provide an output file name where the generated table will be saved.\n";
    const sourceLink = "https://www.kali.org/tools/rainbowcrack/#rtgen"; // Link to the source code
    const tutorial = "https://docs.google.com/document/d/1oTDlAp708Lrxhs-KwhfX9G3RgNrk2gGa1Xm7KhRnZXg/edit?usp=sharing"; // Link to the official documentation/tutorial
    const dependencies = ["rtgen"]; // Contains the dependencies required by the component.

    // Form hook to handle form input
    let form = useForm({
        initialValues: {
            hashAlgorithm: "",
            charset: "",
            plaintextLengthMin: "",
            plaintextLengthMax: "",
            tableIndex: "",
            chainLength: "",
            chainCount: "",
            partIndex: "",
        },
    });

    useEffect(() => {
        // Check if the command is available and set the state variables accordingly.
        checkAllCommandsAvailability(dependencies)
            .then((isAvailable) => {
                setIsCommandAvailable(isAvailable); // Set the command availability state
                setOpened(!isAvailable); // Set the modal state to opened if the command is not available
                setLoadingModal(false); // Set loading to false after the check is done
            })
            .catch((error) => {
                console.error("An error occurred:", error);
                setLoadingModal(false); // Also set loading to false in case of error
            });
    }, []);

    /**
     * handleProcessData: Callback to handle and append new data from the child process to the output.
     * It updates the state by appending the new data received to the existing output.
     * @param {string} data - The data received from the child process.
     */
    const handleProcessData = useCallback((data: string) => {
        setOutput((prevOutput) => prevOutput + "\n" + data); // Append new data to the previous output.
    }, []);

    /**
     * handleProcessTermination: Callback to handle the termination of the child process.
     * Once the process termination is handled, it clears the process PID reference and
     * deactivates the loading overlay.
     * @param {object} param - An object containing information about the process termination.
     * @param {number} param.code - The exit code of the terminated process.
     * @param {number} param.signal - The signal code indicating how the process was terminated.
     */
    const handleProcessTermination = useCallback(
        ({ code, signal }: { code: number; signal: number }) => {
            // If the process was successful, display a success message.
            if (code === 0) {
                handleProcessData("\nProcess completed successfully.");
                // If the process was terminated due to a signal, display the signal code.
            } else if (signal === 15) {
                handleProcessData("\nProcess was manually terminated.");
                // If the process was terminated with an error, display the exit code and signal code.
            } else {
                handleProcessData(`\nProcess terminated with exit code: ${code} and signal code: ${signal}`);
            }

            // Clear the child process pid reference. There is no longer a valid process running.
            setPid("");

            // Cancel the loading overlay. The process has completed.
            setLoading(false);
        },
        [handleProcessData] // Dependency on the handleProcessData callback
    );

    /**
     * Handles form submission for the Rtgen component.
     * @param {FormValuesType} values - The form values containing the parameters for table generation.
     */
    const onSubmit = async (values: FormValuesType) => {
        // Activate loading state to indicate ongoing process
        setLoading(true);

        // Construct arguments for the Rtgen command based on form input
        let args = [];
        args = [
            values.hashAlgorithm,
            values.charset,
            values.plaintextLengthMin,
            values.plaintextLengthMax,
            values.tableIndex,
            values.chainLength,
            values.chainCount,
            values.partIndex,
        ];

        // Execute the Rtgen command via helper method and handle its output or potential errors
        CommandHelper.runCommandWithPkexec("rtgen", args, handleProcessData, handleProcessTermination)
            .then(({ output }) => {
                // Update the output with the results of the command execution.
                setOutput(output);
                // Deactivate loading state
                setLoading(false);
            })
            .catch((error) => {
                // Display any errors encountered during command execution
                setOutput(`Error: ${error.message}`);
                // Deactivate loading state
                setLoading(false);
            });
        setAllowSave(true);
    };

    /**
     * Handles the completion of output saving by updating state variables.
     */ /*
    const handleSaveComplete = () => {
        setHasSaved(true); // Set hasSaved state to true
        setAllowSave(false); // Disallow further output saving
    };
    */

    /**
     * Clears the command output and resets state variables related to output saving.
     */
    const clearOutput = () => {
        setOutput(""); // Clear the command output
        setHasSaved(false); // Reset hasSaved state
        setAllowSave(false); // Disallow further output saving
    };

    // Render component
    return (
        <RenderComponent
            title={title}
            description={description}
            steps={steps}
            tutorial={tutorial}
            sourceLink={sourceLink}
        >
            {!loadingModal && (
                <InstallationModal
                    isOpen={opened}
                    setOpened={setOpened}
                    feature_description={description}
                    dependencies={dependencies}
                />
            )}
            <form onSubmit={form.onSubmit(onSubmit)}>
                <Stack>
                    {LoadingOverlayAndCancelButton(loading, pid)}
                    <TextInput
                        label="Hash Algorithm"
                        required
                        {...form.getInputProps("hashAlgorithm")}
                        placeholder="e.g., MD5"
                    />
                    <TextInput
                        label="Character set"
                        required
                        {...form.getInputProps("charset")}
                        placeholder="e.g., alphanumeric"
                    />
                    <TextInput
                        label="Minimum Plaintext Length"
                        required
                        type="number"
                        {...form.getInputProps("plaintextLengthMin")}
                        placeholder="e.g., 1"
                    />
                    <TextInput
                        label="Maximum Plaintext Length"
                        required
                        type="number"
                        {...form.getInputProps("plaintextLengthMax")}
                        placeholder="e.g., 7"
                    />
                    <TextInput
                        label="Table Index"
                        required
                        type="number"
                        {...form.getInputProps("tableIndex")}
                        placeholder="e.g., 0"
                    />
                    <TextInput
                        label="Chain Length"
                        required
                        type="number"
                        {...form.getInputProps("chainLength")}
                        placeholder="e.g., 1000"
                    />
                    <TextInput
                        label="Chain Count"
                        required
                        type="number"
                        {...form.getInputProps("chainCount")}
                        placeholder="e.g., 100000"
                    />
                    <TextInput
                        label="Part Index"
                        required
                        type="number"
                        {...form.getInputProps("partIndex")}
                        placeholder="e.g., 0"
                    />
                    <Button type={"submit"}>Generate {title}</Button>
                    {/* {SaveOutputToTextFile_v2(output, allowSave, hasSaved, handleSaveComplete)} */}
                    <ConsoleWrapper output={output} clearOutputCallback={clearOutput} />
                </Stack>
            </form>
        </RenderComponent>
    );
};

export default Rtgen;
