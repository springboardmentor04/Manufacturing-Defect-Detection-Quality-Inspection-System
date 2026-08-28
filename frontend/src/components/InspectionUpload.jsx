import {Camera} from "lucide-react";
function InspectionUpload(){
return(
<div className="panel inspection">
<h2>
Product Inspection
</h2>
<div className="upload-box">
<Camera size={55}/>
<h3>
Upload Product Image
</h3>
<p>
Drag & Drop Image
</p>
<button>
Start Inspection
</button>
</div>
<div className="inspection-result">
<h3>
Latest Result
</h3>
<p>
Product:
<b>
 Automotive Gear Component
</b>
</p>
<h1 className="pass">
PASS ✅
</h1>
<p>
Confidence: 98.7%
</p>
<p>
Inspection Time:
0.21 sec
</p>


</div>



</div>


)


}


export default InspectionUpload;