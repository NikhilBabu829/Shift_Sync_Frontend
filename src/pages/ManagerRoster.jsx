import React, { useState } from 'react';
import {
    Box, Typography, Container, Button, Paper, Table, TableBody,
    TableCell, TableContainer, TableHead, TableRow, Dialog,
    DialogTitle, DialogContent, DialogActions, TextField, MenuItem,
    FormControl, InputLabel, Select, IconButton, Snackbar, Alert
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DeleteIcon from '@mui/icons-material/Delete';
import { useNavigate } from 'react-router-dom';

const BLUE = "#1a3a6b";
const ACCENT = "#2563eb";

const STAFF_MEMBERS = ["Marcus Chen", "Sarah Jenkins", "David Wilson", "Elena Rodriguez", "Alex Morgan"];
const DAYS_OF_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export default function ManagerRoster() {
    const navigate = useNavigate();

    // Mocked initial roster
    const [roster, setRoster] = useState([
        { id: 1, staff: "Marcus Chen", day: "Monday", shiftTime: "08:00 - 16:00" },
        { id: 2, staff: "Elena Rodriguez", day: "Tuesday", shiftTime: "09:00 - 17:00" },
        { id: 3, staff: "Sarah Jenkins", day: "Wednesday", shiftTime: "07:30 - 19:45" }
    ]);

    const [openDialog, setOpenDialog] = useState(false);
    const [newShift, setNewShift] = useState({ staff: '', day: '', shiftTime: '' });
    const [snack, setSnack] = useState({ open: false, msg: '', severity: 'success' });

    const handleAddShiftClick = () => {
        setOpenDialog(true);
    };

    const handleCloseDialog = () => {
        setOpenDialog(false);
        setNewShift({ staff: '', day: '', shiftTime: '' });
    };

    const handleSaveShift = () => {
        if (!newShift.staff || !newShift.day || !newShift.shiftTime) {
            setSnack({ open: true, msg: "Please fill all fields", severity: "error" });
            return;
        }

        const newShiftEntry = {
            ...newShift,
            id: Date.now()
        };

        setRoster([...roster, newShiftEntry]);
        setSnack({ open: true, msg: "Shift added successfully", severity: "success" });
        handleCloseDialog();
    };

    const handleDeleteShift = (id) => {
        setRoster(roster.filter(shift => shift.id !== id));
        setSnack({ open: true, msg: "Shift removed", severity: "info" });
    };

    const handleSaveRoster = () => {
        // Simulate API call to save full roster
        setSnack({ open: true, msg: "Roster saved to backend successfully", severity: "success" });
    };

    return (
        <Box sx={{ minHeight: "100vh", bgcolor: "#f0f4f8", py: 4 }}>
            <Container maxWidth="lg">
                <Box sx={{ display: "flex", alignItems: "center", mb: 4 }}>
                    <IconButton onClick={() => navigate("/manager-dashboard")} sx={{ mr: 2 }}>
                        <ArrowBackIcon />
                    </IconButton>
                    <Typography variant="h4" fontWeight={800} color={BLUE}>Weekly Roster Management</Typography>
                </Box>

                <Paper elevation={0} sx={{ border: "1px solid #e5e7eb", borderRadius: 3, p: 3, mb: 4 }}>
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
                        <Typography variant="h6" fontWeight={700} color={BLUE}>Current Shifts</Typography>
                        <Box>
                            <Button variant="outlined" sx={{ mr: 2 }} onClick={handleAddShiftClick}>+ Add Shift</Button>
                            <Button variant="contained" sx={{ bgcolor: ACCENT }} onClick={handleSaveRoster}>Save Roster</Button>
                        </Box>
                    </Box>

                    <TableContainer>
                        <Table>
                            <TableHead>
                                <TableRow sx={{ bgcolor: "#f8fafc" }}>
                                    <TableCell sx={{ fontWeight: 700 }}>Staff Member</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>Day</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>Shift Time</TableCell>
                                    <TableCell sx={{ fontWeight: 700, width: 100 }}>Actions</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {roster.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={4} align="center" sx={{ py: 3, color: "text.secondary" }}>
                                            No shifts scheduled for this week.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    roster.map((shift) => (
                                        <TableRow key={shift.id}>
                                            <TableCell>{shift.staff}</TableCell>
                                            <TableCell>{shift.day}</TableCell>
                                            <TableCell>{shift.shiftTime}</TableCell>
                                            <TableCell>
                                                <IconButton size="small" color="error" onClick={() => handleDeleteShift(shift.id)}>
                                                    <DeleteIcon fontSize="small" />
                                                </IconButton>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Paper>
            </Container>

            {/* Add Shift Dialog */}
            <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ fontWeight: 700, color: BLUE }}>Add New Shift</DialogTitle>
                <DialogContent dividers>
                    <FormControl fullWidth sx={{ mb: 3, mt: 1 }}>
                        <InputLabel>Staff Member</InputLabel>
                        <Select
                            value={newShift.staff}
                            label="Staff Member"
                            onChange={(e) => setNewShift({ ...newShift, staff: e.target.value })}
                        >
                            {STAFF_MEMBERS.map(staff => <MenuItem key={staff} value={staff}>{staff}</MenuItem>)}
                        </Select>
                    </FormControl>

                    <FormControl fullWidth sx={{ mb: 3 }}>
                        <InputLabel>Day</InputLabel>
                        <Select
                            value={newShift.day}
                            label="Day"
                            onChange={(e) => setNewShift({ ...newShift, day: e.target.value })}
                        >
                            {DAYS_OF_WEEK.map(day => <MenuItem key={day} value={day}>{day}</MenuItem>)}
                        </Select>
                    </FormControl>

                    <TextField
                        fullWidth
                        label="Shift Time (e.g. 09:00 - 17:00)"
                        value={newShift.shiftTime}
                        onChange={(e) => setNewShift({ ...newShift, shiftTime: e.target.value })}
                    />
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={handleCloseDialog} color="inherit">Cancel</Button>
                    <Button onClick={handleSaveShift} variant="contained" sx={{ bgcolor: ACCENT }}>Add Shift</Button>
                </DialogActions>
            </Dialog>

            <Snackbar
                open={snack.open}
                autoHideDuration={4000}
                onClose={() => setSnack(s => ({ ...s, open: false }))}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert severity={snack.severity} onClose={() => setSnack(s => ({ ...s, open: false }))} sx={{ width: '100%' }}>
                    {snack.msg}
                </Alert>
            </Snackbar>
        </Box>
    );
}
