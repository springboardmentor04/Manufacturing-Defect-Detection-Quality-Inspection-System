function KPICard({title,value,subtitle,trend}){


return(

<div className="kpi-card">


<h4>
{title}
</h4>


<h2>
{value}
</h2>


<p>
{subtitle}
</p>


<span>
{trend}
</span>


</div>

)

}


export default KPICard;