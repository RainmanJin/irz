package com.imfbp.rz.domain.rzpricecalcf.query;

import java.io.Serializable;
import com.platform.common.utils.query.BaseQuery;

public class RzPricecalCfQuery extends BaseQuery implements Serializable{

	private static final long serialVersionUID = 1L;

	//主键
	private String pkPricecalCf;
	//主键
	private String pkPricecal;
	//收付计划期次
	private String prd;
	//计划收支日期
	private String planpmtdate;
	//计划收付类型
	private Integer planpmttype;
	//计划收付类别
	private Integer planpmtcategory;
	//收付期间
	private String pmtdur;
	//期间天数
	private Integer durdays;
	//租赁利率(%)
	private Double leaseRate;
	//应收本金
	private Double receivableAmt;
	//应收利息
	private Double receivableInt;
	//应收租金
	private Double receivableRent;
	//应收手续费
	private Double receivableFee;
	//应收款合计
	private Double receivableTotal;
	//应付融资金额
	private Double payableFa;
	//应付服务费
	private Double payableSc;
	//应付款项金额
	private Double payableAmt;
	//序号
	private Integer seqNo;
	

	public void setPkPricecalCf(String pkPricecalCf){
		this.pkPricecalCf =  pkPricecalCf;
	}
	
	public String getPkPricecalCf(){
		return pkPricecalCf;
	}

	public void setPkPricecal(String pkPricecal){
		this.pkPricecal =  pkPricecal;
	}
	
	public String getPkPricecal(){
		return pkPricecal;
	}

	public void setPrd(String prd){
		this.prd =  prd;
	}
	
	public String getPrd(){
		return prd;
	}

	public void setPlanpmtdate(String planpmtdate){
		this.planpmtdate =  planpmtdate;
	}
	
	public String getPlanpmtdate(){
		return planpmtdate;
	}

	public void setPlanpmttype(Integer planpmttype){
		this.planpmttype =  planpmttype;
	}
	
	public Integer getPlanpmttype(){
		return planpmttype;
	}

	public void setPlanpmtcategory(Integer planpmtcategory){
		this.planpmtcategory =  planpmtcategory;
	}
	
	public Integer getPlanpmtcategory(){
		return planpmtcategory;
	}

	public void setPmtdur(String pmtdur){
		this.pmtdur =  pmtdur;
	}
	
	public String getPmtdur(){
		return pmtdur;
	}

	public void setDurdays(Integer durdays){
		this.durdays =  durdays;
	}
	
	public Integer getDurdays(){
		return durdays;
	}

	public void setLeaseRate(Double leaseRate){
		this.leaseRate =  leaseRate;
	}
	
	public Double getLeaseRate(){
		return leaseRate;
	}

	public void setReceivableAmt(Double receivableAmt){
		this.receivableAmt =  receivableAmt;
	}
	
	public Double getReceivableAmt(){
		return receivableAmt;
	}

	public void setReceivableInt(Double receivableInt){
		this.receivableInt =  receivableInt;
	}
	
	public Double getReceivableInt(){
		return receivableInt;
	}

	public void setReceivableRent(Double receivableRent){
		this.receivableRent =  receivableRent;
	}
	
	public Double getReceivableRent(){
		return receivableRent;
	}

	public void setReceivableFee(Double receivableFee){
		this.receivableFee =  receivableFee;
	}
	
	public Double getReceivableFee(){
		return receivableFee;
	}

	public void setReceivableTotal(Double receivableTotal){
		this.receivableTotal =  receivableTotal;
	}
	
	public Double getReceivableTotal(){
		return receivableTotal;
	}

	public void setPayableFa(Double payableFa){
		this.payableFa =  payableFa;
	}
	
	public Double getPayableFa(){
		return payableFa;
	}

	public void setPayableSc(Double payableSc){
		this.payableSc =  payableSc;
	}
	
	public Double getPayableSc(){
		return payableSc;
	}

	public void setPayableAmt(Double payableAmt){
		this.payableAmt =  payableAmt;
	}
	
	public Double getPayableAmt(){
		return payableAmt;
	}

	public void setSeqNo(Integer seqNo){
		this.seqNo =  seqNo;
	}
	
	public Integer getSeqNo(){
		return seqNo;
	}
}




 

