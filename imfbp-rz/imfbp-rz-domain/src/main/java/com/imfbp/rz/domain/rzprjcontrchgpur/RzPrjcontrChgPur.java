package com.imfbp.rz.domain.rzprjcontrchgpur;


import java.io.Serializable;

public class RzPrjcontrChgPur  implements Serializable{

	private static final long serialVersionUID = 1L;

	//主键
	private String pkPrjcontrChgPur;
	//供应商外键
	private String pkPrjcontrChgSupplier;
	//项目评审主键  
	private String pkPrjcontrChg;
	//采购合同编号
	private String purContrCode;
	//采购合同名称
	private String purContrName;
	//合同类型 ：0 融资租赁合同、1 担保合同、2买卖合同、3抵质押合同、4转让合同、5 保险合同
	private Integer purContrType;
	//设备金额(元)
	private Double eqptAmt;
	//租赁物折让比例(%)
	private Double discountPer;
	//折让金额
	private Double discountAmt;
	//合同预计签订日期
	private String planSignedDate;
	//合同签订日期
	private String signedDate;
	

	public void setPkPrjcontrChgPur(String pkPrjcontrChgPur){
		this.pkPrjcontrChgPur =  pkPrjcontrChgPur;
	}
	
	public String getPkPrjcontrChgPur(){
		return pkPrjcontrChgPur;
	}

	public void setPkPrjcontrChgSupplier(String pkPrjcontrChgSupplier){
		this.pkPrjcontrChgSupplier =  pkPrjcontrChgSupplier;
	}
	
	public String getPkPrjcontrChgSupplier(){
		return pkPrjcontrChgSupplier;
	}

	public void setPkPrjcontrChg(String pkPrjcontrChg){
		this.pkPrjcontrChg =  pkPrjcontrChg;
	}
	
	public String getPkPrjcontrChg(){
		return pkPrjcontrChg;
	}

	public void setPurContrCode(String purContrCode){
		this.purContrCode =  purContrCode;
	}
	
	public String getPurContrCode(){
		return purContrCode;
	}

	public void setPurContrName(String purContrName){
		this.purContrName =  purContrName;
	}
	
	public String getPurContrName(){
		return purContrName;
	}

	public void setPurContrType(Integer purContrType){
		this.purContrType =  purContrType;
	}
	
	public Integer getPurContrType(){
		return purContrType;
	}

	public void setEqptAmt(Double eqptAmt){
		this.eqptAmt =  eqptAmt;
	}
	
	public Double getEqptAmt(){
		return eqptAmt;
	}

	public void setDiscountPer(Double discountPer){
		this.discountPer =  discountPer;
	}
	
	public Double getDiscountPer(){
		return discountPer;
	}

	public void setDiscountAmt(Double discountAmt){
		this.discountAmt =  discountAmt;
	}
	
	public Double getDiscountAmt(){
		return discountAmt;
	}

	public void setPlanSignedDate(String planSignedDate){
		this.planSignedDate =  planSignedDate;
	}
	
	public String getPlanSignedDate(){
		return planSignedDate;
	}

	public void setSignedDate(String signedDate){
		this.signedDate =  signedDate;
	}
	
	public String getSignedDate(){
		return signedDate;
	}
}