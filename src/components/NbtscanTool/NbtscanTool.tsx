import { Button, LoadingOverlay, Stack, TextInput, Switch, Checkbox } from "@mantine/core";
import { useForm } from "@mantine/form";
import { useCallback, useState } from "react";
import { CommandHelper } from "../../utils/CommandHelper";
import ConsoleWrapper from "../ConsoleWrapper/ConsoleWrapper";
import { UserGuide } from "../UserGuide/UserGuide";
import { SaveOutputToTextFile_v2 } from "../SaveOutputToFile/SaveOutputToTextFile";
import { LoadingOverlayAndCancelButton } from "../OverlayAndCancelButton/OverlayAndCancelButton";

const title = "Nbtscan Tool";
const description_userguide =
    "Nbtscan is a command-line tool designed to scan for NetBIOS information on a network. " +
    "It can help identify devices, workgroups, and NetBIOS names on a network, providing valuable " +
    "information for network reconnaissance and security assessments. Nbtscan is particularly useful " +
    "for identifying legacy systems and applications that rely on NetBIOS. The tool is easy to use " +
    "and supports scanning for multiple IP addresses or IP address ranges.\n\nMore information on how " +
    "to use nbtscan, along with usage examples, can be found in its official documentation: " +
    "https://www.kali.org/tools/nbtscan/\n\n" +
    "Using Nbtscan Tool:\n" +
    "Step 1: Enter a Target Subnet to scan.\n" +
    "       Eg: 192.168.1.0/24\n\n" +
    "Step 2: Click Scan Subnet to commence the Nbtscan tools operation.\n\n" +
    "Step 3: View the Output block below to view the results of the tools execution.\n\n" +
    "Switch to Advanced Mode for further options.";

//list of input values collected by the form
interface FormValuesType {
    subnet: string;
    dumpPacket: boolean;
    scanRange: string;
    timeout: number;
    bandwidth: string;
    retransmits: number;
}

//sets the state of the tool; loading or not, what the output is
const NbtscanTool = () => {
    const [loading, setLoading] = useState(false);
    const [output, setOutput] = useState("");
    const [checkedAdvanced, setCheckedAdvanced] = useState(false);
    const [pid, setPid] = useState("");
    const [allowSave, setAllowSave] = useState(false);
    const [hasSaved, setHasSaved] = useState(false);
    const [subnet, setsubnet] = useState("");
    const [checkedPacketDump, setcheckedPacketDump] = useState(false); 

    let form = useForm({
        initialValues: {
            scanRange: "",
            timeout: 1000,
            bandwidth: "",
            retransmits: 0,
        },
    });

    // Uses the callback function of runCommandGetPidAndOutput to handle and save data
    // generated by the executing process into the output state variable.
    const handleProcessData = useCallback((data: string) => {
        setOutput((prevOutput) => prevOutput + "\n" + data); // Update output
    }, []);

    // Uses the onTermination callback function of runCommandGetPidAndOutput to handle
    // the termination of that process, resetting state variables, handling the output data,
    // and informing the user.
    const handleProcessTermination = useCallback(
        ({ code, signal }: { code: number; signal: number }) => {
            if (code === 0) {
                handleProcessData("\nProcess completed successfully.");
            } else if (signal === 15) {
                handleProcessData("\nProcess was manually terminated.");
            } else {
                handleProcessData(`\nProcess terminated with exit code: ${code} and signal code: ${signal}`);
            }
            // Clear the child process pid reference
            setPid("");
            // Cancel the Loading Overlay
            setLoading(false);

            // Allow Saving as the output is finalised
            setAllowSave(true);
            setHasSaved(false);
        },
        [handleProcessData]
    );

    // Actions taken after saving the output
    const handleSaveComplete = () => {
        // Indicating that the file has saved which is passed
        // back into SaveOutputToTextFile to inform the user
        setHasSaved(true);
        setAllowSave(false);
    };

    //sets the loading state to True, provides arguments for the tool
    const onSubmit = async (values: FormValuesType) => {
        // Disallow saving until the tool's execution is complete
        setAllowSave(false);

        // Start the Loading Overlay
        setLoading(true);
        const args = [];

        if (values.subnet) {
            args.push(`${values.subnet}`);
        }
        //Push -d parameter based on the flag
        if (checkedPacketDump)    {
            args.push(`-d`);
        }

        if (values.scanRange) {
            args.push(values.scanRange);
        }

        if (values.timeout) {
            args.push(`-t ${values.timeout}`);
        }

        if (values.bandwidth) {
            args.push(`-b ${values.bandwidth}`);
        }

        if (values.retransmits) {
            args.push(`-m ${values.retransmits}`);
        }

        try {
            const result = await CommandHelper.runCommandGetPidAndOutput(
                "nbtscan",
                args,
                handleProcessData,
                handleProcessTermination
            );
            setPid(result.pid);
            setOutput(result.output);
            
            
        } catch (e: any) {
            setOutput(e.message);
            
        }

    };

    //clears output without completely refreshing the tool
    const clearOutput = useCallback(() => {
        setOutput("");
        setHasSaved(false);
        setAllowSave(false);
        
    }, [setOutput]);
    

    return (
        <form onSubmit={form.onSubmit(onSubmit)}>
            {LoadingOverlayAndCancelButton(loading, pid)}
            <Stack>
                {UserGuide(title, description_userguide)}
                <Switch
                    size="md"
                    label="Advanced Mode"
                    checked={checkedAdvanced}
                    onChange={(e) => setCheckedAdvanced(e.currentTarget.checked)}
                />
                {!checkedAdvanced && (
                <TextInput label={"Subnet"} required {...form.getInputProps("subnet")} />
                )}
                {checkedAdvanced && (
                    <>
                        <Checkbox
                            label={"Dump Packets Mode"}
                            //Check the status of the option
                            checked={checkedPacketDump}
                            onChange={(e) => setcheckedPacketDump(e.currentTarget.checked)}
                                                    />
                        <TextInput
                            label={"Range to Scan"}
                            placeholder={"Format of xxx.xxx.xxx.xxx/xx or xxx.xxx.xxx.xxx-xxx."}
                            {...form.getInputProps("scanRange")}
                        />
                        <TextInput
                            label={"Timeout Delay"}
                            placeholder={"in milliseconds; default is 1000"}
                            {...form.getInputProps("timeout")}
                        />
                        <TextInput
                            label={"Bandwidth"}
                            placeholder={"Kilobytes per second; default is 128"}
                            {...form.getInputProps("bandwidth")}
                        />
                        <TextInput
                            label={"Retransmits"}
                            placeholder={"number; default is 0"}
                            {...form.getInputProps("retransmits")}
                        />
                    </>
                )}
                <Button type={"submit"}>Scan Subnet</Button>
                
                {SaveOutputToTextFile_v2(output, allowSave, hasSaved, handleSaveComplete)}
                
                <ConsoleWrapper output={output} clearOutputCallback={clearOutput} />
            </Stack>
        </form>
    );
};

export default NbtscanTool;
