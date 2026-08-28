function InspectionHistory(){
return(
<div className="panel">
<h2>
Recent Inspection History
</h2>
<table>
<thead>
<tr>
<th>
Product ID
</th>
<th>
Product
</th>
<th>
Result
</th>
<th>
Confidence
</th>
<th>
Date
</th>
</tr>
</thead>



<tbody>


<tr>
<td>P001</td>
<td>Gear Assembly</td>
<td className="pass">
PASS
</td>
<td>
99%
</td>
<td>
Today
</td>
</tr>


<tr>
<td>P002</td>
<td>PCB Board</td>
<td className="fail">
DEFECT
</td>
<td>
96%
</td>
<td>
Today
</td>
</tr>



<tr>
<td>P003</td>
<td>Bearing</td>
<td className="pass">
PASS
</td>
<td>
98%
</td>
<td>
Today
</td>
</tr>



</tbody>


</table>


</div>


)

}


export default InspectionHistory;