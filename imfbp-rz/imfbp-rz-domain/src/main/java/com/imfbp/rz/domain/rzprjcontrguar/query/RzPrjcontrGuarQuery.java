package com.imfbp.rz.domain.rzprjcontrguar.query;

import java.io.Serializable;
import com.platform.common.utils.query.BaseQuery;

public class RzPrjcontrGuarQuery extends BaseQuery implements Serializable{

	private static final long serialVersionUID = 1L;

	//主键
	private String pkPrjcontrGuar;
	//项目评审主键  
	private String pkPrjcontr;
	//担保人（客户主键）
	private String pkCustomer;
	//担保方式：0 信用、1 质押、2 抵押、3 保证、4 综合担保、5 其他
	private Integer guarType;
	//担保金额
	private Double guarAmt;
	//抵押金额
	private Double mortgageAmt;
	//质押金额
	private Double pledgeAmt;
	//提供担保原因
	private String guarReson;
	//备注
	private String remark;
	

	public void setPkPrjcontrGuar(String pkPrjcontrGuar){
		this.pkPrjcontrGuar =  pkPrjcontrGuar;
	}
	
	public String getPkPrjcontrGuar(){
		return pkPrjcontrGuar;
	}

	public void setPkPrjcontr(String pkPrjcontr){
		this.pkPrjcontr =  pkPrjcontr;
	}
	
	public String getPkPrjcontr(){
		return pkPrjcontr;
	}

	public void setPkCustomer(String pkCustomer){
		this.pkCustomer =  pkCustomer;
	}
	
	public String getPkCustomer(){
		return pkCustomer;
	}

	public void setGuarType(Integer guarType){
		this.guarType =  guarType;
	}
	
	public Integer getGuarType(){
		return guarType;
	}

	public void setGuarAmt(Double guarAmt){
		this.guarAmt =  guarAmt;
	}
	
	public Double getGuarAmt(){
		return guarAmt;
	}

	public void setMortgageAmt(Double mortgageAmt){
		this.mortgageAmt =  mortgageAmt;
	}
	
	public Double getMortgageAmt(){
		return mortgageAmt;
	}

	public void setPledgeAmt(Double pledgeAmt){
		this.pledgeAmt =  pledgeAmt;
	}
	
	public Double getPledgeAmt(){
		return pledgeAmt;
	}

	public void setGuarReson(String guarReson){
		this.guarReson =  guarReson;
	}
	
	public String getGuarReson(){
		return guarReson;
	}

	public void setRemark(String remark){
		this.remark =  remark;
	}
	
	public String getRemark(){
		return remark;
	}
}




 

