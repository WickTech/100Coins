enum CoinGeckoApi {
  AllCoins = "coins/markets?vs_currency=usd&page=1&per_page=30&sparkline=false",
  Base = "https://api.coingecko.com/api/v3"
}

enum RequestStatus {
  Error = "Error",
  Idle = "Idle",
  Loading = "Loading",
  Success = "Success"
}

enum Color {
  Green = "76, 175, 80",
  Red = "198, 40, 40"
}

interface ICrypto {
  change: number;
  id: string;
  image: string;
  marketCap: number;
  name: string;
  price: number;
  rank: number;
  supply: number;
  symbol: string;
  volume: number;
}

interface IChartPoint {
  price: number;
  timestamp: number;
}

/* ---------- Crypto Utility ---------- */

interface ICryptoUtility {
  formatPercent: (value: number) => string;
  formatUSD: (value: number) => string;
  getByID: (id: string, cryptos: ICrypto[]) => ICrypto | null;
  map: (data: any) => ICrypto;
  mapAll: (data: any[]) => ICrypto[];
}

const CryptoUtility: ICryptoUtility = {
  formatPercent: (value: number): string => {
    return (value / 100).toLocaleString("en-US", { style: "percent", minimumFractionDigits: 2 });
  },
  formatUSD: (value: number): string => {
    return value.toLocaleString("en-US", { style: "currency", currency: "USD" });
  },
  getByID: (id: string, cryptos: ICrypto[]): ICrypto | null => {
    const match: ICrypto = cryptos.find((crypto: ICrypto) => crypto.id === id);
    
    return match || null;
  },
  map: (data: any): ICrypto => {
    return {
      change: data.price_change_percentage_24h,
      id: data.id,
      image: data.image,
      marketCap: CryptoUtility.formatUSD(data.market_cap),
      name: data.name,
      price: CryptoUtility.formatUSD(data.current_price),
      rank: data.market_cap_rank,
      supply: data.circulating_supply.toLocaleString(),
      symbol: data.symbol,
      volume: CryptoUtility.formatUSD(data.total_volume)
    }
  },
  mapAll: (data: any[]): ICrypto[] => {
    return data.map((item: any) => CryptoUtility.map(item));
  }
}

/* ---------- Chart Utility ---------- */

interface IChartUtility {
  draw: (id: string, points: IChartPoint[], change: number) => Chart;
  getDatasetOptions: (change: number) => Chart.ChartDataSets;
  getOptions: (points: IChartPoint[]) => Chart.ChartOptions;
  getUrl: (id: string) => string;
  mapPoints: (data: any) => IChartPoint[];
  update: (chart: Chart, points: IChartPoint[], change: number) => void;
}

const ChartUtility: IChartUtility = {
  draw: (id: string, points: IChartPoint[], change: number): Chart => {
    const canvas: HTMLCanvasElement | null = document.getElementById(id) as HTMLCanvasElement | null;
    
    if(canvas !== null) {
      const context: CanvasRenderingContext2D | null = canvas.getContext("2d");
      
      const {
        clientHeight: height,
        clientWidth: width
      } = context.canvas;
      
      context.stroke();
      
      return new Chart(context, {
        type: "line",
        data: {
          datasets: [{
            data: points.map((point: IChartPoint) => point.price),
            ...ChartUtility.getDatasetOptions(change)
          }],
          labels: points.map((point: IChartPoint) => point.timestamp)
        },
        options: ChartUtility.getOptions(points)
      })
    }
  },
  getDatasetOptions: (change: number): Chart.ChartDataSets => {
    const color: Color = change >= 0 ? Color.Green : Color.Red;
  
    return {
      backgroundColor: "rgba(" + color + ", 0.1)",
      borderColor: "rgba(" + color + ", 0.5)",
      fill: true,
      tension: 0.2,
      pointRadius: 0
    }
  },
  getOptions: (points: IChartPoint[]): Chart.ChartOptions => {      
    const min: number = Math.min.apply(Math, points.map((point: IChartPoint) => point.price)),
          max: number = Math.max.apply(Math, points.map((point: IChartPoint) => point.price));      
    
    return {
      maintainAspectRatio: false,
      responsive: true,
      scales: {
        x: {
          display: false,
          gridLines: {
            display: false
          }
        },
        y: {
          display: false,
          gridLines: {
            display: false
          },
          suggestedMin: min * 0.98,
          suggestedMax: max * 1.02
        }
      },
      plugins: {
        legend: {
          display: false
        },
        title: {
          display: false
        }
      }
    }
  },
  getUrl: (id: string): string => {
    return `${CoinGeckoApi.Base}/coins/${id}/market_chart?vs_currency=usd&days=1`;
  },
  mapPoints: (data: any): IChartPoint[] => {
    return data.prices.map((price: number[]) => ({
      price: price[1],
      timestamp: price[0]
    }))
  },
  update: (chart: Chart, points: IChartPoint[], change: number): void => {      
    chart.options = ChartUtility.getOptions(points);
    
    const options: Chart.ChartDataSets = ChartUtility.getDatasetOptions(change);
      
    chart.data.datasets[0].data = points.map((point: IChartPoint) => point.price);
    chart.data.datasets[0].backgroundColor = options.backgroundColor;
    chart.data.datasets[0].borderColor = options.borderColor;    
    chart.data.datasets[0].pointRadius = options.pointRadius;
    
    chart.data.labels = points.map((point: IChartPoint) => point.timestamp);
    
    chart.update();
  }
}

/* ---------- Loading Component ---------- */

const LoadingSpinner: React.FC = () => {
  return (    
    <div className="loading-spinner-wrapper">
      <div className="loading-spinner">
        <i className="fa-regular fa-spinner-third" />
      </div>
    </div>
  );
}

/* ---------- Crypto List Component ---------- */

const CryptoListToggle: React.FC = () => {
  const { state, toggleList } = React.useContext(AppContext);
  
  if(state.status === RequestStatus.Success && state.cryptos.length > 0) {
    const classes: string = classNames(
      "fa-regular", { 
      "fa-bars": !state.listToggled, 
      "fa-xmark": state.listToggled 
    });

    return (  
      <button
        id="crypto-list-toggle-button"
        onClick={() => toggleList(!state.listToggled)}
      >
        <i className={classes} />
      </button>
    )
  }

  return null;
}

interface CryptoListItemProps {
  crypto: ICrypto;
}

const CryptoListItem: React.FC<CryptoListItemProps> = (props: CryptoListItemProps) => {
  const { state, selectCrypto } = React.useContext(AppContext);
  
  const { crypto } = props;
  
  const getClasses = (): string => {
    const selected: boolean = state.selectedCrypto && state.selectedCrypto.id === crypto.id;
    
    return classNames(
      "crypto-list-item", {
      selected    
    });
  }
  
  return (
    <button type="button" className={getClasses()} onClick={() => selectCrypto(crypto.id)}>
      <div className="crypto-list-item-background">
        <h1 className="crypto-list-item-symbol">{crypto.symbol}</h1>
        <img className="crypto-list-item-background-image" src={crypto.image} />
      </div>
      <div className="crypto-list-item-content">
        <h1 className="crypto-list-item-rank">{crypto.rank}</h1>
        <img className="crypto-list-item-image" src={crypto.image} />
        <div className="crypto-list-item-details">
          <h1 className="crypto-list-item-name">{crypto.name}</h1>
          <h1 className="crypto-list-item-price">{crypto.price}</h1>
        </div>
      </div>
    </button>
  );
}

const CryptoList: React.FC = () => {
  const { state } = React.useContext(AppContext);
  
  if(state.status === RequestStatus.Success && state.cryptos.length > 0) {
    const getItems = (): JSX.Element[] => {
      return state.cryptos.map((crypto: ICrypto) => (
        <CryptoListItem key={crypto.id} crypto={crypto} />
      ));
    }

    return (
      <div id="crypto-list">
        {getItems()}
      </div>
    );
  }
  
  return null;
}

/* ---------- Crypto Price Chart Component ---------- */

interface ICryptoPriceChartState {
  chart: Chart;
  points: IChartPoint[];
  status: RequestStatus;
}

const CryptoPriceChart: React.FC = () => {
  const { selectedCrypto: crypto } = React.useContext(AppContext).state;
  
  const id: string = "crypto-price-chart";
  
  const [state, setStateTo] = React.useState<ICryptoPriceChartState>({
    chart: null,
    points: [],
    status: RequestStatus.Loading
  });
  
  const setStatusTo = (status: RequestStatus): void => {
    setStateTo({ ...state, status });
  }
  
  const setChartTo = (chart: Chart): void => {
    setStateTo({ ...state, chart });
  }
  
  React.useEffect(() => {
    const fetch = async (): Promise<void> => {
      try {
        setStatusTo(RequestStatus.Loading);
        
        const res: any = await axios.get(ChartUtility.getUrl(crypto.id));
        
        setStateTo({
          ...state,
          points: ChartUtility.mapPoints(res.data),
          status: RequestStatus.Success
        });
      } catch (err) {
        console.error(err);
        
        setStatusTo(RequestStatus.Error);
      }
    }
    
    fetch();
  }, [crypto]);
  
  React.useEffect(() => {
    if(state.chart === null && state.status === RequestStatus.Success) {
      setChartTo(ChartUtility.draw(id, state.points, crypto.change));
    }
  }, [state.status]);
  
  React.useEffect(() => {
    if(state.chart !== null) {
      const update = (): void => ChartUtility.update(state.chart, state.points, crypto.change);
      
      update();
    }
  }, [state.chart, state.points]);
  
  const getLoadingSpinner = (): JSX.Element => {
    if(state.status === RequestStatus.Loading) {
      return (
        <div id="crypto-price-chart-loading-spinner">
          <LoadingSpinner />
        </div>
      );
    }
  }
  
  return (
    <div id="crypto-price-chart-wrapper">
      <canvas id={id} />
      {getLoadingSpinner()}
    </div>
  );
}

/* ---------- Crypto Details Component ---------- */

interface CryptoFieldProps {
  className?: string;
  label: string;
  value: string | number;
}

const CryptoField: React.FC<CryptoFieldProps> = (props: CryptoFieldProps) => {
  return (
    <div className={classNames("crypto-field", props.className)}>
      <h1 className="crypto-field-value">{props.value}</h1>
      <h1 className="crypto-field-label">{props.label}</h1>
    </div>
  );
}

interface ICryptoDetailsState {
  crypto: ICrypto;
  transitioning: boolean;
}

const CryptoDetails: React.FC = () => {
  const { selectedCrypto } = React.useContext(AppContext).state;
  
  const [state, setStateTo] = React.useState<ICryptoDetailsState>({
    crypto: null,
    transitioning: true
  });
  
  const setTransitioningTo = (transitioning: boolean): void => {
    setStateTo({ ...state, transitioning });
  }
  
  const { crypto } = state;
  
  React.useEffect(() => {
    if(selectedCrypto !== null) {
      setTransitioningTo(true);
      
      const timeout: NodeJS.Timeout = setTimeout(() => {
        setStateTo({ crypto: selectedCrypto, transitioning: false });
      }, 500);
      
      return () => {
        clearTimeout(timeout);
      }
    }
  }, [selectedCrypto]);
  
  if(crypto !== null) {
    const sign: string = crypto.change >= 0 ? "positive" : "negative";
    
    return (
      <div id="crypto-details" className={classNames(sign, { transitioning: state.transitioning })}>
        <div id="crypto-details-content">
          <div id="crypto-fields">
            <CryptoField label="Rank" value={crypto.rank} />
            <CryptoField label="Name" value={crypto.name} />
            <CryptoField label="Price" value={crypto.price} />
            <CryptoField label="Market Cap" value={crypto.marketCap} />
            <CryptoField label="24H Volume" value={crypto.volume} />
            <CryptoField label="Circulating Supply" value={crypto.supply} />
            <CryptoField 
              className={sign}
              label="24H Change" 
              value={CryptoUtility.formatPercent(crypto.change)} 
            />
          </div>
          <CryptoPriceChart />
          <h1 id="crypto-details-symbol">{crypto.symbol}</h1>
        </div>
      </div>
    );
  }

  return null;
}

/* ---------- App Component ---------- */

interface IAppState {
  cryptos: ICrypto[];
  listToggled: boolean;
  selectedCrypto: ICrypto;
  status: RequestStatus;
}

interface IAppContext {
  state: IAppState;
  selectCrypto: (id: string) => void;
  setStateTo: (state: IAppState) => void;
  toggleList: (listToggled: boolean) => void;
}

const AppContext = React.createContext<IAppContext>(null);

const App: React.FC = () => {
  const [state, setStateTo] = React.useState<IAppState>({
    cryptos: [],
    listToggled: true,
    selectedCrypto: null,
    status: RequestStatus.Loading
  });
  
  const setStatusTo = (status: RequestStatus): void => {
    setStateTo({ ...state, status });
  }
  
  const selectCrypto = (id: string): void => {
    setStateTo({ 
      ...state, 
      listToggled: window.innerWidth > 800,
      selectedCrypto: CryptoUtility.getByID(id, state.cryptos)
    });
  }
  
  const toggleList = (listToggled: boolean): void => {
    setStateTo({ ...state, listToggled });
  }
  
  React.useEffect(() => {
    const fetch = async (): Promise<void> => {
      try {
        setStatusTo(RequestStatus.Loading);
        
        const res: any = await axios.get(`${CoinGeckoApi.Base}/${CoinGeckoApi.AllCoins}`);
        
        setStateTo({
          ...state,
          cryptos: CryptoUtility.mapAll(res.data),
          status: RequestStatus.Success
        });
      } catch (err) {
        console.error(err);
        
        setStatusTo(RequestStatus.Error);
      }
    }
    
    fetch();
  }, []);
  
  React.useEffect(() => {
    if(state.status === RequestStatus.Success && state.cryptos.length > 0) {
      selectCrypto(state.cryptos[0].id);
    }
  }, [state.status]);
  
  const getLoadingSpinner = (): JSX.Element => {
    if(state.status === RequestStatus.Loading) {
      return (
        <LoadingSpinner />
      );
    }
  }
  
  return(
    <AppContext.Provider value={{ state, selectCrypto, setStateTo, toggleList }}>
      <div id="app" className={classNames({ "list-toggled": state.listToggled })}>
        <CryptoList />
        <CryptoDetails />
        <CryptoListToggle />
        {getLoadingSpinner()}
      </div>
    </AppContext.Provider>
  )
}

ReactDOM.render(<App/>, document.getElementById("root"));