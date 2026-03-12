'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  CalendarIcon, 
  Search, 
  Download, 
  FileText, 
  Users, 
  AlertTriangle,
  Eye,
  ChevronDown,
  ChevronRight,
  Lock
} from 'lucide-react';
import { format } from 'date-fns';
import { subscribe } from '@/lib/realtime';

// Types
interface Staff {
  id: string;
  name: string;
  role: string;
  contact: string;
  email?: string;
  dateJoined: string;
  isActive: boolean;
}

interface StaffLog {
  id: string;
  staffId: string;
  staffName: string;
  role: string;
  date: string;
  timeIn?: string;
  timeOut?: string;
  duties: string;
  notes: string;
  isPresent: boolean;
}

interface StaffData {
  staff: Staff[];
  deletedStaff: Staff[];
  staffLogs: StaffLog[];
}

const STAFF_ROLES = ['Teacher', 'Admin', 'Security', 'Support Staff', 'Driver'];

const StaffLogReadonly: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [staffData, setStaffData] = useState<StaffData>({
    staff: [],
    deletedStaff: [],
    staffLogs: []
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [selectedStaff, setSelectedStaff] = useState<string>('all');
  const [expandedRoles, setExpandedRoles] = useState<Set<string>>(new Set(STAFF_ROLES));

  // Load data with realtime updates
  useEffect(() => {
    loadStaffData();
    setupRealtimeListeners();
  }, []);

  const setupRealtimeListeners = () => {
    try {
      // Subscribe to staff collection for realtime updates
      const unsubscribeStaff = subscribe<Staff>('staff', (docs: Staff[]) => {
        setStaffData(prev => ({ ...prev, staff: docs.filter((s: Staff) => s.isActive) }));
      });

      // Subscribe to deleted staff collection
      const unsubscribeDeleted = subscribe<Staff>('deletedStaff', (docs: Staff[]) => {
        setStaffData(prev => ({ ...prev, deletedStaff: docs }));
      });

      // Subscribe to staff logs collection
      const unsubscribeLogs = subscribe<StaffLog>('staffLogs', (docs: StaffLog[]) => {
        setStaffData(prev => ({ ...prev, staffLogs: docs }));
      });

      // Cleanup subscriptions on unmount
      return () => {
        unsubscribeStaff();
        unsubscribeDeleted();
        unsubscribeLogs();
      };
    } catch (error) {
      console.error('Subscription error:', error);
      // Fallback to localStorage if subscription fails
      loadStaffData();
    }
  };

  const loadStaffData = async () => {
    try {
      // Try to load from Supabase first, then fallback to localStorage
      const localData = localStorage.getItem('staffData');
      if (localData) {
        setStaffData(JSON.parse(localData));
      } else {
        // Initialize with empty data - will be populated by sync
        const initialData: StaffData = {
          staff: [],
          deletedStaff: [],
          staffLogs: []
        };
        setStaffData(initialData);
      }
    } catch (error) {
      console.error('Error loading staff data:', error);
    }
  };

  // Get today's logs
  const todaysLogs = useMemo(() => {
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    return staffData.staffLogs.filter(log => log.date === dateStr);
  }, [staffData.staffLogs, selectedDate]);

  // Get absent staff
  const absentStaff = useMemo(() => {
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const presentStaffIds = todaysLogs.map(log => log.staffId);
    return staffData.staff.filter(staff => 
      staff.isActive && !presentStaffIds.includes(staff.id)
    );
  }, [staffData.staff, todaysLogs]);

  // Filter logs based on search and filters
  const filteredLogs = useMemo(() => {
    let logs = todaysLogs;

    if (searchTerm) {
      logs = logs.filter(log => 
        log.staffName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.duties.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.notes.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedRole !== 'all') {
      logs = logs.filter(log => log.role === selectedRole);
    }

    if (selectedStaff !== 'all') {
      logs = logs.filter(log => log.staffId === selectedStaff);
    }

    return logs;
  }, [todaysLogs, searchTerm, selectedRole, selectedStaff]);

  // Group logs by role
  const logsByRole = useMemo(() => {
    const grouped: Record<string, StaffLog[]> = {};
    STAFF_ROLES.forEach(role => {
      grouped[role] = filteredLogs.filter(log => log.role === role);
    });
    return grouped;
  }, [filteredLogs]);

  // Statistics
  const stats = useMemo(() => {
    const totalStaff = staffData.staff.filter(s => s.isActive).length;
    const presentToday = todaysLogs.length;
    const absentToday = absentStaff.length;

    return { totalStaff, presentToday, absentToday };
  }, [staffData.staff, todaysLogs, absentStaff]);

  const toggleRoleExpansion = (role: string) => {
    const newExpanded = new Set(expandedRoles);
    if (newExpanded.has(role)) {
      newExpanded.delete(role);
    } else {
      newExpanded.add(role);
    }
    setExpandedRoles(newExpanded);
  };

  const exportToCSV = () => {
    const headers = ['Date', 'Staff Name', 'Role', 'Time In', 'Time Out', 'Duties', 'Notes'];
    const csvContent = [
      headers.join(','),
      ...filteredLogs.map(log => [
        log.date,
        log.staffName,
        log.role,
        log.timeIn || '',
        log.timeOut || '',
        `"${log.duties}"`,
        `"${log.notes}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `staff-log-${format(selectedDate, 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Readonly Notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center gap-2 text-blue-800">
          <Lock className="w-5 h-5" />
          <span className="font-medium">Read-Only Mode</span>
        </div>
        <p className="text-blue-700 text-sm mt-1">
          This is a read-only view of the staff log data synced from the desktop application. 
          To make changes, please use the main desktop application.
        </p>
      </div>

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Staff Log Sheet</h1>
          <p className="text-muted-foreground">View daily staff attendance and activities</p>
        </div>
        <div className="flex gap-2">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Eye className="w-4 h-4 mr-2" />
                Deleted Staff
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl">
              <DialogHeader>
                <DialogTitle>Deleted Staff List</DialogTitle>
                <DialogDescription>
                  View deleted staff members (read-only)
                </DialogDescription>
              </DialogHeader>
              <div className="max-h-96 overflow-y-auto">
                {staffData.deletedStaff.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No deleted staff members</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead>Date Joined</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {staffData.deletedStaff.map((staff) => (
                        <TableRow key={staff.id}>
                          <TableCell>{staff.name}</TableCell>
                          <TableCell>{staff.role}</TableCell>
                          <TableCell>{staff.contact}</TableCell>
                          <TableCell>{format(new Date(staff.dateJoined), 'MMM dd, yyyy')}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Staff</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalStaff}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Present Today</CardTitle>
            <Users className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.presentToday}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Absent Today</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.absentToday}</div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        {/* Date Selection and Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Filters & Date Selection</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div>
                <Label>Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(selectedDate, 'PPP')}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={(date) => date && setSelectedDate(date)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <Label>Search</Label>
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search staff, duties..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>
              <div>
                <Label>Role Filter</Label>
                <Select value={selectedRole} onValueChange={setSelectedRole}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    {STAFF_ROLES.map(role => (
                      <SelectItem key={role} value={role}>{role}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Staff Filter</Label>
                <Select value={selectedStaff} onValueChange={setSelectedStaff}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Staff</SelectItem>
                    {staffData.staff.filter(s => s.isActive).map(staff => (
                      <SelectItem key={staff.id} value={staff.id}>{staff.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Button onClick={exportToCSV} variant="outline" className="flex-1">
                  <Download className="w-4 h-4 mr-2" />
                  Export CSV
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Absent Staff Alert */}
        {absentStaff.length > 0 && (
          <Card className="border-red-200 bg-red-50">
            <CardHeader>
              <CardTitle className="text-red-800 flex items-center">
                <AlertTriangle className="w-5 h-5 mr-2" />
                Absent Staff ({absentStaff.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {absentStaff.map(staff => (
                  <Badge key={staff.id} variant="destructive">
                    {staff.name} - {staff.role}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Logs Display by Role */}
        <div className="space-y-4">
          {STAFF_ROLES.map(role => {
            const roleLogs = logsByRole[role];
            if (roleLogs.length === 0) return null;

            return (
              <Card key={role}>
                <CardHeader 
                  className="cursor-pointer"
                  onClick={() => toggleRoleExpansion(role)}
                >
                  <CardTitle className="flex items-center justify-between">
                    <span>{role} ({roleLogs.length})</span>
                    {expandedRoles.has(role) ? 
                      <ChevronDown className="w-5 h-5" /> : 
                      <ChevronRight className="w-5 h-5" />
                    }
                  </CardTitle>
                </CardHeader>
                {expandedRoles.has(role) && (
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Staff Name</TableHead>
                          <TableHead>Time In</TableHead>
                          <TableHead>Time Out</TableHead>
                          <TableHead>Duties</TableHead>
                          <TableHead>Notes</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {roleLogs.map(log => (
                          <TableRow key={log.id}>
                            <TableCell className="font-medium">{log.staffName}</TableCell>
                            <TableCell>
                              {log.timeIn ? (
                                <Badge variant={
                                  new Date(`2000-01-01T${log.timeIn}`) > new Date(`2000-01-01T08:30`) 
                                    ? "destructive" : "default"
                                }>
                                  {log.timeIn}
                                </Badge>
                              ) : '-'}
                            </TableCell>
                            <TableCell>{log.timeOut || '-'}</TableCell>
                            <TableCell>{log.duties}</TableCell>
                            <TableCell>{log.notes}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default StaffLogReadonly;
