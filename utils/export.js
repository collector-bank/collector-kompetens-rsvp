const excel = require('node-excel-export');
const stringify = require('csv-stringify');

module.exports = {
  
  sendEventParticipantListAsCsv: function(event, response) {
    //const event = await db.getEvent(request.params.eventId);
    response.setHeader('Content-Type', 'text/csv;charset=utf-8');
    response.setHeader('Content-Disposition', 'attachment; filename=\"' + 'participants-in-' + event.title.toLowerCase().replace(/\s/g,'-') + '.csv\"');
    response.write("\uFEFF");  // send BOM to make Excel happy
    stringify(event.participants.map((x) => { return { 'Name':x.name, 'Email':x.email, 'Food Preference':x.foodPreference } }), { header: true, delimiter:'\t' })
      .pipe(response);           
  },
  
  eventParticipantListAsExcel: function(event) {
    const styles = {
      header: {
        fill: {
          fgColor: {
            rgb: 'FF000000'
          }
        },
        font: {
          color: {
            rgb: 'FFFFFFFF'
          },
          //sz: 14,
          bold: true,
          //underline: true
        }
      },
      cell: {
        fill: {
          fgColor: {
            rgb: 'FFFFCCFF'
          }
        }
      }
    };
    
    let specification = {
      name: {
        displayName: 'Name',
        headerStyle: styles.header,
        //cellStyle: styles.cell,
        width: 300,
        height: 50
      },
      
      email: {
        displayName: 'Email',
        headerStyle: styles.header,
        //cellStyle: styles.cell,
        width: 400         
      },
      
      foodPreference: {
        displayName: 'Food Preference',
        headerStyle: styles.header,
        //cellStyle: styles.cell,
        width: 300         
        
      }
    };
    
    const report = excel.buildExport(
      [
        {
          name: 'Food Order',
          specification: specification,
          data: event.participants
        }
      ]
    ); 

    return report;
  },
  
  sendEventParticipantListAsExcel: function(event, response) {
    const report = this.eventParticipantListAsExcel(event);
    response.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    response.setHeader('Content-Disposition', 'attachment; filename=\"' + 'participants-in-' + event.title.toLowerCase().replace(/\s/g,'-') + '.xlsx\"');    
    return response.send(report);    
  }
  
}