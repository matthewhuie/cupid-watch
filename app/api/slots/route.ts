import { NextResponse } from 'next/server';

export async function GET() {
  console.log(`[${new Date().toISOString()}] API: Fetching slots natively...`);

  const url = 'https://clerkscheduler.cityofnewyork.us/s/sfsites/aura?r=6&aura.ApexAction.execute=1';

  const body = new URLSearchParams({
    message: JSON.stringify({
      actions: [
        {
          id: "85;a",
          descriptor: "aura://ApexActionController/ACTION$execute",
          callingDescriptor: "UNKNOWN",
          params: {
            namespace: "",
            classname: "SCHED_BookAppointmentController",
            method: "getSlots",
            params: {
              isDeviceMobile: false,
              isCeremonyFlow: true,
              isLicenseFlow: false,
              isDomesticFlow: false,
              isCertificateOfNonImpediment: false,
              isRecordsRoom: false,
              isMarriageOfficiantRegistration: false,
              isMarriageOfficiant: false,
              isPageLoad: true,
              isDateChanged: false,
              isWeekChanged: false,
              weekAction: null,
              locationId: "0013d000004l890AAA",
              selectedDate: null,
              selectedSlotId: null,
              selectedSlotData: "null"
            },
            cacheable: false,
            isContinuation: false
          }
        }
      ]
    }),
    'aura.context': JSON.stringify({
      mode: "PROD",
      fwuid: "ZkJhOVpLN2NZQkJrd2NWd3pMcnFOdzJEa1N5enhOU3R5QWl2VzNveFZTbGcxMy4tMjE0NzQ4MzY0OC4xMzEwNzIwMA",
      app: "siteforce:communityApp",
      loaded: {
        "APPLICATION@markup://siteforce:communityApp": "1547_6p-2GBd9IQWZ4UXs1Im3BQ"
      },
      dn: [],
      globals: {},
      uad: true
    }),
    'aura.pageURI': '/s/MarriageCeremony',
    'aura.token': 'null'
  });

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });

    if (!response.ok) {
      throw new Error(`External API responded with status: ${response.status}`);
    }

    const rawData = await response.json();
    
    // Equivalent of the jq transformation:
    // .actions[0].returnValue.returnValue.daySlotsColumns | map({dateHeader, slots})
    const actions = rawData.actions;
    if (!actions || !actions[0] || !actions[0].returnValue || !actions[0].returnValue.returnValue) {
      throw new Error('Unexpected API response structure');
    }

    const daySlotsColumns = actions[0].returnValue.returnValue.daySlotsColumns;
    const transformedData = daySlotsColumns.map((col: any) => ({
      dateHeader: col.dateHeader,
      slots: col.slots.map((slot: any) => ({
        startDateTime: slot.startDateTime,
        startTime: slot.startTime,
        timeAriaLabel: slot.timeAriaLabel,
        timeLabel: slot.timeLabel,
      })),
    }));

    console.log(`[${new Date().toISOString()}] API: Successfully fetched slots natively`);
    return NextResponse.json({
      data: transformedData,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
