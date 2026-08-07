export const formulas = [

  // =========================
  // MATHEMATICS
  // =========================

  {
    id: 1,
    title: "Quadratic Formula",
    subject: "Mathematics",
    category: "Algebra",
    level: "Foundation",

    formula:
      "x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}",

    explanation:
      "Used to solve quadratic equations of the form ax² + bx + c = 0.",

    variables: [
      { symbol: "a", meaning: "coefficient of x²" },
      { symbol: "b", meaning: "coefficient of x" },
      { symbol: "c", meaning: "constant term" },
    ],

    example: "Solve x² + 5x + 6 = 0",
  },

  {
    id: 2,
    title: "Pythagoras Theorem",
    subject: "Mathematics",
    category: "Geometry",
    level: "Foundation",

    formula: "a^2 + b^2 = c^2",

    explanation:
      "Relates the sides of a right-angled triangle.",

    variables: [
      { symbol: "a", meaning: "opposite side" },
      { symbol: "b", meaning: "adjacent side" },
      { symbol: "c", meaning: "hypotenuse" },
    ],

    example: "Find hypotenuse when a=3, b=4",
  },

  {
    id: 3,
    title: "Area of a Circle",
    subject: "Mathematics",
    category: "Geometry",
    level: "Foundation",

    formula: "A = \\pi r^2",

    explanation:
      "Used to calculate the area of a circle.",

    variables: [
      { symbol: "A", meaning: "area" },
      { symbol: "r", meaning: "radius" },
      { symbol: "\\pi", meaning: "3.142 or 22/7" },
    ],

    example: "Find area when r = 7cm",
  },

  {
    id: 4,
    title: "Simple Interest",
    subject: "Mathematics",
    category: "Commercial Math",
    level: "Foundation",

    formula: "SI = \\frac{PRT}{100}",

    explanation:
      "Calculates simple interest on a principal amount.",

    variables: [
      { symbol: "P", meaning: "principal" },
      { symbol: "R", meaning: "rate" },
      { symbol: "T", meaning: "time" },
    ],

    example: "Find SI when P=5000, R=10%, T=2yrs",
  },

  {
    id: 5,
    title: "Compound Interest",
    subject: "Mathematics",
    category: "Commercial Math",
    level: "University",

    formula:
      "A = P\\left(1 + \\frac{r}{n}\\right)^{nt}",

    explanation:
      "Used to calculate compound interest.",

    variables: [
      { symbol: "A", meaning: "final amount" },
      { symbol: "P", meaning: "principal" },
      { symbol: "r", meaning: "interest rate" },
      { symbol: "n", meaning: "number of times compounded" },
      { symbol: "t", meaning: "time" },
    ],

    example: "Find amount after 2 years",
  },

  {
    id: 6,
    title: "Slope Formula",
    subject: "Mathematics",
    category: "Coordinate Geometry",
    level: "Foundation",

    formula:
      "m = \\frac{y_2 - y_1}{x_2 - x_1}",

    explanation:
      "Calculates the slope of a straight line.",

    variables: [
      { symbol: "m", meaning: "slope" },
      { symbol: "x_1", meaning: "first x-coordinate" },
      { symbol: "x_2", meaning: "second x-coordinate" },
      { symbol: "y_1", meaning: "first y-coordinate" },
      { symbol: "y_2", meaning: "second y-coordinate" },
    ],

    example: "Find slope between (2,3) and (4,7)",
  },

  {
    id: 7,
    title: "Distance Formula",
    subject: "Mathematics",
    category: "Coordinate Geometry",
    level: "Foundation",

    formula:
      "d = \\sqrt{(x_2-x_1)^2 + (y_2-y_1)^2}",

    explanation:
      "Calculates distance between two points.",

    variables: [
      { symbol: "d", meaning: "distance" },
      { symbol: "x_1", meaning: "first x-coordinate" },
      { symbol: "x_2", meaning: "second x-coordinate" },
      { symbol: "y_1", meaning: "first y-coordinate" },
      { symbol: "y_2", meaning: "second y-coordinate" },
    ],

    example: "Find distance between (1,2) and (4,6)",
  },

  {
    id: 8,
    title: "Volume of Cylinder",
    subject: "Mathematics",
    category: "Mensuration",
    level: "Foundation",

    formula: "V = \\pi r^2 h",

    explanation:
      "Used to calculate the volume of a cylinder.",

    variables: [
      { symbol: "V", meaning: "volume" },
      { symbol: "r", meaning: "radius" },
      { symbol: "h", meaning: "height" },
    ],

    example: "Find volume when r=7cm and h=10cm",
  },

  {
    id: 9,
    title: "Area of Triangle",
    subject: "Mathematics",
    category: "Geometry",
    level: "Foundation",

    formula: "A = \\frac{1}{2}bh",

    explanation:
      "Calculates the area of a triangle.",

    variables: [
      { symbol: "b", meaning: "base" },
      { symbol: "h", meaning: "height" },
    ],

    example: "Find area when b=10cm and h=8cm",
  },

  {
    id: 10,
    title: "Probability Formula",
    subject: "Mathematics",
    category: "Statistics",
    level: "Foundation",

    formula:
      "P(E) = \\frac{n(E)}{n(S)}",

    explanation:
      "Measures likelihood of an event occurring.",

    variables: [
      { symbol: "n(E)", meaning: "favorable outcomes" },
      { symbol: "n(S)", meaning: "sample space" },
    ],

    example: "Probability of getting 3 on a dice",
  },

  // =========================
  // PHYSICS
  // =========================

  {
    id: 11,
    title: "Ohm's Law",
    subject: "Physics",
    category: "Electricity",
    level: "Foundation",

    formula: "V = IR",

    explanation:
      "Relates voltage, current, and resistance in a circuit.",

    variables: [
      { symbol: "V", meaning: "Voltage (V)" },
      { symbol: "I", meaning: "Current (A)" },
      { symbol: "R", meaning: "Resistance (Ω)" },
    ],

    example: "If I = 2A and R = 5Ω, find V",
  },

  {
    id: 12,
    title: "Newton's Second Law",
    subject: "Physics",
    category: "Mechanics",
    level: "Foundation",

    formula: "F = ma",

    explanation:
      "Force acting on an object is equal to mass × acceleration.",

    variables: [
      { symbol: "F", meaning: "Force (N)" },
      { symbol: "m", meaning: "mass (kg)" },
      { symbol: "a", meaning: "acceleration (m/s²)" },
    ],

    example: "Find force when m=10kg, a=2m/s²",
  },

  {
    id: 13,
    title: "Kinetic Energy",
    subject: "Physics",
    category: "Energy",
    level: "University",

    formula:
      "KE = \\frac{1}{2}mv^2",

    explanation:
      "Energy possessed by a moving object.",

    variables: [
      { symbol: "m", meaning: "mass" },
      { symbol: "v", meaning: "velocity" },
    ],

    example: "Find KE of a 2kg object moving at 3m/s",
  },

  {
    id: 14,
    title: "Potential Energy",
    subject: "Physics",
    category: "Energy",
    level: "Foundation",

    formula: "PE = mgh",

    explanation:
      "Energy possessed due to position or height.",

    variables: [
      { symbol: "m", meaning: "mass" },
      { symbol: "g", meaning: "gravity" },
      { symbol: "h", meaning: "height" },
    ],

    example: "Find PE of a 5kg object at 10m",
  },

  {
    id: 15,
    title: "Speed Formula",
    subject: "Physics",
    category: "Motion",
    level: "Foundation",

    formula:
      "Speed = \\frac{Distance}{Time}",

    explanation:
      "Calculates how fast an object moves.",

    variables: [
      { symbol: "Distance", meaning: "distance traveled" },
      { symbol: "Time", meaning: "time taken" },
    ],

    example: "Find speed if 100m covered in 20s",
  },

  {
    id: 16,
    title: "Momentum",
    subject: "Physics",
    category: "Mechanics",
    level: "Foundation",

    formula: "p = mv",

    explanation:
      "Momentum is mass multiplied by velocity.",

    variables: [
      { symbol: "p", meaning: "momentum" },
      { symbol: "m", meaning: "mass" },
      { symbol: "v", meaning: "velocity" },
    ],

    example: "Find momentum of 4kg object at 5m/s",
  },

  {
    id: 17,
    title: "Pressure Formula",
    subject: "Physics",
    category: "Fluid Mechanics",
    level: "Foundation",

    formula:
      "P = \\frac{F}{A}",

    explanation:
      "Pressure is force per unit area.",

    variables: [
      { symbol: "P", meaning: "pressure" },
      { symbol: "F", meaning: "force" },
      { symbol: "A", meaning: "area" },
    ],

    example: "Find pressure when F=100N and A=5m²",
  },

  {
    id: 18,
    title: "Wave Equation",
    subject: "Physics",
    category: "Waves",
    level: "Foundation",

    formula: "v = f\\lambda",

    explanation:
      "Relates wave speed, frequency, and wavelength.",

    variables: [
      { symbol: "v", meaning: "wave speed" },
      { symbol: "f", meaning: "frequency" },
      { symbol: "\\lambda", meaning: "wavelength" },
    ],

    example: "Find wave speed when f=50Hz",
  },

  // =========================
  // CHEMISTRY
  // =========================

  {
    id: 19,
    title: "Mole Formula",
    subject: "Chemistry",
    category: "Stoichiometry",
    level: "Foundation",

    formula:
      "n = \\frac{m}{M}",

    explanation:
      "Relates mass, molar mass, and number of moles.",

    variables: [
      { symbol: "n", meaning: "number of moles" },
      { symbol: "m", meaning: "mass (g)" },
      { symbol: "M", meaning: "molar mass (g/mol)" },
    ],

    example: "Find moles of 10g of NaCl",
  },

  {
    id: 20,
    title: "pH Formula",
    subject: "Chemistry",
    category: "Acids & Bases",
    level: "University",

    formula:
      "pH = -\\log[H^+]",

    explanation:
      "Measures acidity or alkalinity of a solution.",

    variables: [
      {
        symbol: "[H^+]",
        meaning:
          "hydrogen ion concentration",
      },
    ],

    example:
      "Find pH if [H⁺] = 1×10⁻³",
  },

  {
    id: 21,
    title: "Density Formula",
    subject: "Chemistry",
    category: "Physical Chemistry",
    level: "Foundation",

    formula:
      "\\rho = \\frac{m}{V}",

    explanation:
      "Density is mass per unit volume.",

    variables: [
      { symbol: "\\rho", meaning: "density" },
      { symbol: "m", meaning: "mass" },
      { symbol: "V", meaning: "volume" },
    ],

    example: "Find density of 20g occupying 5cm³",
  },

  {
    id: 22,
    title: "Percentage Yield",
    subject: "Chemistry",
    category: "Stoichiometry",
    level: "University",

    formula:
      "\\%Yield = \\frac{Actual\\ Yield}{Theoretical\\ Yield} \\times 100",

    explanation:
      "Measures efficiency of a chemical reaction.",

    variables: [
      {
        symbol: "Actual Yield",
        meaning:
          "experimental yield",
      },
      {
        symbol: "Theoretical Yield",
        meaning:
          "expected yield",
      },
    ],

    example:
      "Find percentage yield if actual=8g and theoretical=10g",
  },

  {
    id: 23,
    title: "Avogadro's Law",
    subject: "Chemistry",
    category: "Gas Laws",
    level: "Foundation",

    formula:
      "\\frac{V_1}{n_1} = \\frac{V_2}{n_2}",

    explanation:
      "Equal volumes of gases contain equal number of molecules.",

    variables: [
      { symbol: "V", meaning: "volume" },
      { symbol: "n", meaning: "number of moles" },
    ],

    example: "Find final volume of gas",
  },

  {
    id: 24,
    title: "Ideal Gas Equation",
    subject: "Chemistry",
    category: "Gas Laws",
    level: "University",

    formula:
      "PV = nRT",

    explanation:
      "Relates pressure, volume, temperature, and moles.",

    variables: [
      { symbol: "P", meaning: "pressure" },
      { symbol: "V", meaning: "volume" },
      { symbol: "n", meaning: "moles" },
      { symbol: "R", meaning: "gas constant" },
      { symbol: "T", meaning: "temperature" },
    ],

    example: "Find pressure of gas",
  },

  // =========================
  // BIOLOGY
  // =========================

  {
    id: 25,
    title: "Magnification Formula",
    subject: "Biology",
    category: "Microscopy",
    level: "Foundation",

    formula:
      "Magnification = \\frac{Image\\ Size}{Actual\\ Size}",

    explanation:
      "Used to calculate magnification in microscopy.",

    variables: [
      { symbol: "Image Size", meaning: "measured image size" },
      { symbol: "Actual Size", meaning: "real size" },
    ],

    example: "Find magnification of specimen",
  },

  {
    id: 26,
    title: "Population Growth Rate",
    subject: "Biology",
    category: "Ecology",
    level: "University",

    formula:
      "Growth\\ Rate = Birth\\ Rate - Death\\ Rate",

    explanation:
      "Calculates increase or decrease in population.",

    variables: [
      { symbol: "Birth Rate", meaning: "births in population" },
      { symbol: "Death Rate", meaning: "deaths in population" },
    ],

    example: "Find population growth rate",
  },

  // =========================
  // ECONOMICS
  // =========================

  {
    id: 27,
    title: "Profit Formula",
    subject: "Economics",
    category: "Business",
    level: "Foundation",

    formula:
      "Profit = Selling\\ Price - Cost\\ Price",

    explanation:
      "Calculates profit from a transaction.",

    variables: [
      { symbol: "Selling Price", meaning: "amount sold" },
      { symbol: "Cost Price", meaning: "amount bought" },
    ],

    example: "Find profit if SP=5000 and CP=3500",
  },

  {
    id: 28,
    title: "Percentage Profit",
    subject: "Economics",
    category: "Business",
    level: "Foundation",

    formula:
      "\\%Profit = \\frac{Profit}{Cost\\ Price} \\times 100",

    explanation:
      "Calculates percentage profit.",

    variables: [
      { symbol: "Profit", meaning: "gain made" },
      { symbol: "Cost Price", meaning: "original amount" },
    ],

    example: "Find percentage profit",
  },

  {
    id: 29,
    title: "Demand Function",
    subject: "Economics",
    category: "Microeconomics",
    level: "University",

    formula:
      "Q_d = a - bP",

    explanation:
      "Shows relationship between price and quantity demanded.",

    variables: [
      { symbol: "Q_d", meaning: "quantity demanded" },
      { symbol: "P", meaning: "price" },
    ],

    example: "Find quantity demanded at price 10",
  },

  {
    id: 30,
    title: "Supply Function",
    subject: "Economics",
    category: "Microeconomics",
    level: "University",

    formula:
      "Q_s = a + bP",

    explanation:
      "Shows relationship between price and quantity supplied.",

    variables: [
      { symbol: "Q_s", meaning: "quantity supplied" },
      { symbol: "P", meaning: "price" },
    ],

    example: "Find quantity supplied at price 20",
  },{
  id: 31,
  title: "First Law of Thermodynamics",
  subject: "Thermodynamics",
  category: "Energy Systems",
  level: "University",

  formula:
    "ΔU = Q - W",

  explanation:
    "The change in internal energy equals heat added minus work done by the system.",

  variables: [
    { symbol: "ΔU", meaning: "change in internal energy" },
    { symbol: "Q", meaning: "heat added" },
    { symbol: "W", meaning: "work done" },
  ],

  example:
    "If 500J of heat is added and 200J of work is done, find ΔU.",
},

{
  id: 32,
  title: "Ideal Gas Equation",
  subject: "Thermodynamics",
  category: "Gas Laws",
  level: "University",

  formula:
    "PV = nRT",

  explanation:
    "Relates pressure, volume, temperature, and amount of gas.",

  variables: [
    { symbol: "P", meaning: "pressure" },
    { symbol: "V", meaning: "volume" },
    { symbol: "n", meaning: "number of moles" },
    { symbol: "R", meaning: "gas constant" },
    { symbol: "T", meaning: "temperature" },
  ],

  example:
    "Calculate pressure when n=2, T=300K, and V=0.5m³.",
},

{
  id: 33,
  title: "Heat Transfer Equation",
  subject: "Thermodynamics",
  category: "Heat Transfer",
  level: "University",

  formula:
    "Q = mcΔT",

  explanation:
    "Determines heat energy transferred during temperature change.",

  variables: [
    { symbol: "Q", meaning: "heat energy" },
    { symbol: "m", meaning: "mass" },
    { symbol: "c", meaning: "specific heat capacity" },
    { symbol: "ΔT", meaning: "temperature change" },
  ],

  example:
    "Find heat needed to raise 2kg of water by 20°C.",
},

{
  id: 34,
  title: "Entropy Change",
  subject: "Thermodynamics",
  category: "Entropy",
  level: "University",

  formula:
    "ΔS = Q/T",

  explanation:
    "Measures change in entropy during heat transfer.",

  variables: [
    { symbol: "ΔS", meaning: "change in entropy" },
    { symbol: "Q", meaning: "heat transfer" },
    { symbol: "T", meaning: "absolute temperature" },
  ],

  example:
    "Calculate entropy change when 100J heat is transferred at 300K.",
},

{
  id: 35,
  title: "Thermal Efficiency",
  subject: "Thermodynamics",
  category: "Heat Engines",
  level: "University",

  formula:
    "η = W/Q_h",

  explanation:
    "Measures efficiency of a heat engine.",

  variables: [
    { symbol: "η", meaning: "thermal efficiency" },
    { symbol: "W", meaning: "work output" },
    { symbol: "Q_h", meaning: "heat input" },
  ],

  example:
    "Find efficiency if engine produces 400J work from 1000J heat.",
},

{
  id: 36,
  title: "Carnot Efficiency",
  subject: "Thermodynamics",
  category: "Heat Engines",
  level: "University",

  formula:
    "η = 1 - (T_c/T_h)",

  explanation:
    "Maximum theoretical efficiency of a heat engine.",

  variables: [
    { symbol: "η", meaning: "efficiency" },
    { symbol: "T_c", meaning: "cold reservoir temperature" },
    { symbol: "T_h", meaning: "hot reservoir temperature" },
  ],

  example:
    "Find Carnot efficiency for T_h=600K and T_c=300K.",
},

{
  id: 37,
  title: "Fourier’s Law",
  subject: "Thermodynamics",
  category: "Heat Conduction",
  level: "University",

  formula:
    "Q/t = -kA(dT/dx)",

  explanation:
    "Describes rate of heat conduction through a material.",

  variables: [
    { symbol: "Q/t", meaning: "heat transfer rate" },
    { symbol: "k", meaning: "thermal conductivity" },
    { symbol: "A", meaning: "cross-sectional area" },
    { symbol: "dT/dx", meaning: "temperature gradient" },
  ],

  example:
    "Determine heat flow through a copper rod.",
},

{
  id: 38,
  title: "Newton’s Law of Cooling",
  subject: "Thermodynamics",
  category: "Cooling Systems",
  level: "University",

  formula:
    "dT/dt = -k(T - T_a)",

  explanation:
    "Rate of cooling is proportional to temperature difference.",

  variables: [
    { symbol: "dT/dt", meaning: "rate of temperature change" },
    { symbol: "k", meaning: "cooling constant" },
    { symbol: "T", meaning: "object temperature" },
    { symbol: "T_a", meaning: "ambient temperature" },
  ],

  example:
    "Find cooling rate of a hot object in air.",
},

{
  id: 39,
  title: "Stefan-Boltzmann Law",
  subject: "Thermodynamics",
  category: "Radiation",
  level: "University",

  formula:
    "P = σAT⁴",

  explanation:
    "Power radiated by a black body depends on temperature.",

  variables: [
    { symbol: "P", meaning: "radiated power" },
    { symbol: "σ", meaning: "Stefan-Boltzmann constant" },
    { symbol: "A", meaning: "surface area" },
    { symbol: "T", meaning: "absolute temperature" },
  ],

  example:
    "Calculate radiation power from a heated plate.",
},

{
  id: 40,
  title: "Coefficient of Performance",
  subject: "Thermodynamics",
  category: "Refrigeration",
  level: "University",

  formula:
    "COP = Q_c/W",

  explanation:
    "Measures performance of refrigerators and heat pumps.",

  variables: [
    { symbol: "COP", meaning: "coefficient of performance" },
    { symbol: "Q_c", meaning: "heat removed" },
    { symbol: "W", meaning: "work input" },
  ],

  example:
    "Find COP when refrigerator removes 500J with 100J work.",
},

{
  id: 41,
  title: "Laplace Transform",
  subject: "Engineering Mathematics",
  category: "Transforms",
  level: "University",

  formula:
    "L{f(t)} = ∫₀^∞ e^(-st)f(t)dt",

  explanation:
    "Transforms time-domain functions into frequency-domain.",

  variables: [
    { symbol: "L", meaning: "Laplace transform" },
    { symbol: "f(t)", meaning: "time-domain function" },
    { symbol: "s", meaning: "complex frequency" },
  ],

  example:
    "Find Laplace transform of f(t)=t².",
},

{
  id: 42,
  title: "Fourier Series",
  subject: "Engineering Mathematics",
  category: "Series",
  level: "University",

  formula:
    "f(x)=a₀+Σ(a_n cos(nx)+b_n sin(nx))",

  explanation:
    "Represents periodic functions as sums of sine and cosine waves.",

  variables: [
    { symbol: "a_n", meaning: "cosine coefficients" },
    { symbol: "b_n", meaning: "sine coefficients" },
    { symbol: "n", meaning: "harmonic number" },
  ],

  example:
    "Expand a square wave using Fourier series.",
},

{
  id: 43,
  title: "Euler’s Formula",
  subject: "Engineering Mathematics",
  category: "Complex Numbers",
  level: "University",

  formula:
    "e^(ix)=cos(x)+i sin(x)",

  explanation:
    "Connects exponential and trigonometric functions.",

  variables: [
    { symbol: "e", meaning: "Euler's number" },
    { symbol: "i", meaning: "imaginary unit" },
    { symbol: "x", meaning: "angle in radians" },
  ],

  example:
    "Express e^(iπ) using Euler's formula.",
},

{
  id: 44,
  title: "Differential Equation",
  subject: "Engineering Mathematics",
  category: "Calculus",
  level: "University",

  formula:
    "dy/dx + Py = Q",

  explanation:
    "Represents a first-order linear differential equation.",

  variables: [
    { symbol: "dy/dx", meaning: "derivative of y" },
    { symbol: "P", meaning: "coefficient function" },
    { symbol: "Q", meaning: "forcing function" },
  ],

  example:
    "Solve dy/dx + 2y = 4.",
},

{
  id: 45,
  title: "Matrix Determinant",
  subject: "Engineering Mathematics",
  category: "Matrices",
  level: "University",

  formula:
    "|A| = ad - bc",

  explanation:
    "Determines determinant of a 2×2 matrix.",

  variables: [
    { symbol: "a,b,c,d", meaning: "matrix elements" },
  ],

  example:
    "Find determinant of [[2,3],[1,4]].",
},

{
  id: 46,
  title: "Eigenvalue Equation",
  subject: "Engineering Mathematics",
  category: "Linear Algebra",
  level: "University",

  formula:
    "Aν = λν",

  explanation:
    "Defines eigenvalues and eigenvectors of a matrix.",

  variables: [
    { symbol: "A", meaning: "matrix" },
    { symbol: "λ", meaning: "eigenvalue" },
    { symbol: "ν", meaning: "eigenvector" },
  ],

  example:
    "Find eigenvalues of a 2×2 matrix.",
},

{
  id: 47,
  title: "Binomial Theorem",
  subject: "Engineering Mathematics",
  category: "Algebra",
  level: "University",

  formula:
    "(a+b)^n = Σ[nCr a^(n-r)b^r]",

  explanation:
    "Expands powers of binomials.",

  variables: [
    { symbol: "nCr", meaning: "combination" },
    { symbol: "a,b", meaning: "terms" },
  ],

  example:
    "Expand (x+2)^4.",
},

{
  id: 48,
  title: "Taylor Series",
  subject: "Engineering Mathematics",
  category: "Series",
  level: "University",

  formula:
    "f(x)=f(a)+f'(a)(x-a)+...",

  explanation:
    "Approximates functions using infinite polynomial series.",

  variables: [
    { symbol: "f(x)", meaning: "function" },
    { symbol: "a", meaning: "expansion point" },
  ],

  example:
    "Approximate sin(x) near x=0.",
},

{
  id: 49,
  title: "Gradient Formula",
  subject: "Engineering Mathematics",
  category: "Vector Calculus",
  level: "University",

  formula:
    "∇f = (∂f/∂x)i + (∂f/∂y)j + (∂f/∂z)k",

  explanation:
    "Represents direction of maximum increase of a scalar field.",

  variables: [
    { symbol: "∇f", meaning: "gradient" },
    { symbol: "i,j,k", meaning: "unit vectors" },
  ],

  example:
    "Find gradient of f=x²+y²+z².",
},

{
  id: 50,
  title: "Divergence Formula",
  subject: "Engineering Mathematics",
  category: "Vector Calculus",
  level: "University",

  formula:
    "∇·F = ∂F_x/∂x + ∂F_y/∂y + ∂F_z/∂z",

  explanation:
    "Measures magnitude of a vector field's source or sink.",

  variables: [
    { symbol: "F", meaning: "vector field" },
    { symbol: "∇·F", meaning: "divergence" },
  ],

  example:
    "Compute divergence of a fluid velocity field.",
},

{
  id: 51,
  title: "Curl Formula",
  subject: "Engineering Mathematics",
  category: "Vector Calculus",
  level: "University",

  formula:
    "∇ × F",

  explanation:
    "Measures rotation of a vector field.",

  variables: [
    { symbol: "∇ × F", meaning: "curl of vector field" },
    { symbol: "F", meaning: "vector field" },
  ],

  example:
    "Find curl of a magnetic field.",
},

{
  id: 52,
  title: "Double Integration",
  subject: "Engineering Mathematics",
  category: "Calculus",
  level: "University",

  formula:
    "∬_R f(x,y)dA",

  explanation:
    "Calculates volume under a surface over a region.",

  variables: [
    { symbol: "f(x,y)", meaning: "surface function" },
    { symbol: "dA", meaning: "area element" },
  ],

  example:
    "Find volume under z=x+y over a square region.",
},

{
  id: 53,
  title: "Triple Integration",
  subject: "Engineering Mathematics",
  category: "Calculus",
  level: "University",

  formula:
    "∭_V f(x,y,z)dV",

  explanation:
    "Computes quantities over three-dimensional regions.",

  variables: [
    { symbol: "f(x,y,z)", meaning: "3D function" },
    { symbol: "dV", meaning: "volume element" },
  ],

  example:
    "Find mass of a solid sphere.",
},

{
  id: 54,
  title: "Probability Density Function",
  subject: "Engineering Mathematics",
  category: "Statistics",
  level: "University",

  formula:
    "f(x) = dF(x)/dx",

  explanation:
    "Represents density of continuous random variables.",

  variables: [
    { symbol: "f(x)", meaning: "probability density" },
    { symbol: "F(x)", meaning: "cumulative distribution function" },
  ],

  example:
    "Determine PDF from a given CDF.",
},

{
  id: 55,
  title: "Normal Distribution",
  subject: "Engineering Mathematics",
  category: "Statistics",
  level: "University",

  formula:
    "f(x)=1/(σ√2π)e^(-(x-μ)²/2σ²)",

  explanation:
    "Describes bell-shaped probability distributions.",

  variables: [
    { symbol: "μ", meaning: "mean" },
    { symbol: "σ", meaning: "standard deviation" },
  ],

  example:
    "Find probability within one standard deviation.",
},

{
  id: 56,
  title: "Ohm’s Law",
  subject: "Electrical Engineering",
  category: "Circuit Analysis",
  level: "University",

  formula:
    "V = IR",

  explanation:
    "Relates voltage, current, and resistance.",

  variables: [
    { symbol: "V", meaning: "voltage" },
    { symbol: "I", meaning: "current" },
    { symbol: "R", meaning: "resistance" },
  ],

  example:
    "Find current when voltage is 12V and resistance is 4Ω.",
},

{
  id: 57,
  title: "Electrical Power",
  subject: "Electrical Engineering",
  category: "Power Systems",
  level: "University",

  formula:
    "P = VI",

  explanation:
    "Calculates electrical power in a circuit.",

  variables: [
    { symbol: "P", meaning: "power" },
    { symbol: "V", meaning: "voltage" },
    { symbol: "I", meaning: "current" },
  ],

  example:
    "Determine power when V=220V and I=5A.",
},

{
  id: 58,
  title: "Capacitor Charge",
  subject: "Electrical Engineering",
  category: "Electronics",
  level: "University",

  formula:
    "Q = CV",

  explanation:
    "Charge stored in a capacitor equals capacitance times voltage.",

  variables: [
    { symbol: "Q", meaning: "charge" },
    { symbol: "C", meaning: "capacitance" },
    { symbol: "V", meaning: "voltage" },
  ],

  example:
    "Find charge stored in a 2F capacitor at 5V.",
},

{
  id: 59,
  title: "Inductive Reactance",
  subject: "Electrical Engineering",
  category: "AC Circuits",
  level: "University",

  formula:
    "X_L = 2πfL",

  explanation:
    "Opposition offered by an inductor in AC circuits.",

  variables: [
    { symbol: "X_L", meaning: "inductive reactance" },
    { symbol: "f", meaning: "frequency" },
    { symbol: "L", meaning: "inductance" },
  ],

  example:
    "Find reactance for L=0.2H at 50Hz.",
},

{
  id: 60,
  title: "Capacitive Reactance",
  subject: "Electrical Engineering",
  category: "AC Circuits",
  level: "University",

  formula:
    "X_C = 1/(2πfC)",

  explanation:
    "Opposition offered by a capacitor in AC circuits.",

  variables: [
    { symbol: "X_C", meaning: "capacitive reactance" },
    { symbol: "f", meaning: "frequency" },
    { symbol: "C", meaning: "capacitance" },
  ],

  example:
    "Determine reactance for C=10μF at 60Hz.",
},

{
  id: 61,
  title: "Transformer Equation",
  subject: "Electrical Engineering",
  category: "Transformers",
  level: "University",

  formula:
    "V_p/V_s = N_p/N_s",

  explanation:
    "Relates transformer voltages and turns ratio.",

  variables: [
    { symbol: "V_p", meaning: "primary voltage" },
    { symbol: "V_s", meaning: "secondary voltage" },
    { symbol: "N_p", meaning: "primary turns" },
    { symbol: "N_s", meaning: "secondary turns" },
  ],

  example:
    "Find secondary voltage for a step-down transformer.",
},

{
  id: 62,
  title: "Mechanical Work",
  subject: "Mechanical Engineering",
  category: "Mechanics",
  level: "University",

  formula:
    "W = Fd",

  explanation:
    "Work done equals force multiplied by displacement.",

  variables: [
    { symbol: "W", meaning: "work done" },
    { symbol: "F", meaning: "force" },
    { symbol: "d", meaning: "displacement" },
  ],

  example:
    "Calculate work done moving an object 5m with 20N force.",
},

{
  id: 63,
  title: "Kinetic Energy",
  subject: "Mechanical Engineering",
  category: "Energy",
  level: "University",

  formula:
    "KE = 1/2mv²",

  explanation:
    "Energy possessed by a moving object.",

  variables: [
    { symbol: "m", meaning: "mass" },
    { symbol: "v", meaning: "velocity" },
  ],

  example:
    "Find kinetic energy of a 10kg object moving at 4m/s.",
},

{
  id: 64,
  title: "Potential Energy",
  subject: "Mechanical Engineering",
  category: "Energy",
  level: "University",

  formula:
    "PE = mgh",

  explanation:
    "Energy possessed due to position in a gravitational field.",

  variables: [
    { symbol: "m", meaning: "mass" },
    { symbol: "g", meaning: "gravitational acceleration" },
    { symbol: "h", meaning: "height" },
  ],

  example:
    "Find potential energy of a 2kg object at 10m height.",
},

{
  id: 65,
  title: "Momentum",
  subject: "Mechanical Engineering",
  category: "Dynamics",
  level: "University",

  formula:
    "p = mv",

  explanation:
    "Momentum equals mass times velocity.",

  variables: [
    { symbol: "p", meaning: "momentum" },
    { symbol: "m", meaning: "mass" },
    { symbol: "v", meaning: "velocity" },
  ],

  example:
    "Find momentum of a 5kg body moving at 8m/s.",
},

{
  id: 66,
  title: "Newton’s Second Law",
  subject: "Mechanical Engineering",
  category: "Dynamics",
  level: "University",

  formula:
    "F = ma",

  explanation:
    "Force equals mass multiplied by acceleration.",

  variables: [
    { symbol: "F", meaning: "force" },
    { symbol: "m", meaning: "mass" },
    { symbol: "a", meaning: "acceleration" },
  ],

  example:
    "Calculate force needed to accelerate a 10kg object at 2m/s².",
},

{
  id: 67,
  title: "Stress Formula",
  subject: "Mechanical Engineering",
  category: "Strength of Materials",
  level: "University",

  formula:
    "σ = F/A",

  explanation:
    "Stress equals force per unit area.",

  variables: [
    { symbol: "σ", meaning: "stress" },
    { symbol: "F", meaning: "force" },
    { symbol: "A", meaning: "cross-sectional area" },
  ],

  example:
    "Find stress on a rod with area 0.01m² carrying 1000N.",
},

{
  id: 68,
  title: "Strain Formula",
  subject: "Mechanical Engineering",
  category: "Strength of Materials",
  level: "University",

  formula:
    "ε = ΔL/L",

  explanation:
    "Measures deformation per unit length.",

  variables: [
    { symbol: "ε", meaning: "strain" },
    { symbol: "ΔL", meaning: "change in length" },
    { symbol: "L", meaning: "original length" },
  ],

  example:
    "Calculate strain for a rod stretched by 2mm from 1m.",
},

{
  id: 69,
  title: "Young’s Modulus",
  subject: "Mechanical Engineering",
  category: "Elasticity",
  level: "University",

  formula:
    "E = σ/ε",

  explanation:
    "Ratio of stress to strain in elastic materials.",

  variables: [
    { symbol: "E", meaning: "Young’s modulus" },
    { symbol: "σ", meaning: "stress" },
    { symbol: "ε", meaning: "strain" },
  ],

  example:
    "Determine modulus when stress is 200MPa and strain is 0.002.",
},

{
  id: 70,
  title: "Bernoulli’s Equation",
  subject: "Fluid Mechanics",
  category: "Fluid Flow",
  level: "University",

  formula:
    "P + 1/2ρv² + ρgh = constant",

  explanation:
    "Relates pressure, velocity, and elevation in fluid flow.",

  variables: [
    { symbol: "P", meaning: "pressure" },
    { symbol: "ρ", meaning: "fluid density" },
    { symbol: "v", meaning: "velocity" },
    { symbol: "g", meaning: "gravitational acceleration" },
    { symbol: "h", meaning: "height" },
  ],

  example:
    "Analyze pressure changes in a flowing pipe.",
},
{
  id: 71,
  title: "Continuity Equation",
  subject: "Fluid Mechanics",
  category: "Fluid Flow",
  level: "University",

  formula:
    "A₁V₁ = A₂V₂",

  explanation:
    "States that the mass flow rate of fluid remains constant in a pipe.",

  variables: [
    { symbol: "A₁", meaning: "area at section 1" },
    { symbol: "V₁", meaning: "velocity at section 1" },
    { symbol: "A₂", meaning: "area at section 2" },
    { symbol: "V₂", meaning: "velocity at section 2" },
  ],

  example:
    "Find fluid velocity in a narrow pipe section.",
},

{
  id: 72,
  title: "Hydrostatic Pressure",
  subject: "Fluid Mechanics",
  category: "Pressure",
  level: "University",

  formula:
    "P = ρgh",

  explanation:
    "Pressure exerted by a fluid due to depth.",

  variables: [
    { symbol: "P", meaning: "pressure" },
    { symbol: "ρ", meaning: "density" },
    { symbol: "g", meaning: "gravitational acceleration" },
    { symbol: "h", meaning: "depth" },
  ],

  example:
    "Determine pressure at 10m underwater.",
},

{
  id: 73,
  title: "Reynolds Number",
  subject: "Fluid Mechanics",
  category: "Flow Analysis",
  level: "University",

  formula:
    "Re = ρVD/μ",

  explanation:
    "Determines whether fluid flow is laminar or turbulent.",

  variables: [
    { symbol: "ρ", meaning: "fluid density" },
    { symbol: "V", meaning: "velocity" },
    { symbol: "D", meaning: "pipe diameter" },
    { symbol: "μ", meaning: "dynamic viscosity" },
  ],

  example:
    "Calculate Reynolds number for water flow in a pipe.",
},

{
  id: 74,
  title: "Pascal’s Law",
  subject: "Fluid Mechanics",
  category: "Hydraulics",
  level: "University",

  formula:
    "F₁/A₁ = F₂/A₂",

  explanation:
    "Pressure applied to an enclosed fluid is transmitted equally.",

  variables: [
    { symbol: "F₁", meaning: "input force" },
    { symbol: "A₁", meaning: "input area" },
    { symbol: "F₂", meaning: "output force" },
    { symbol: "A₂", meaning: "output area" },
  ],

  example:
    "Find lifting force in a hydraulic press.",
},

{
  id: 75,
  title: "Buoyant Force",
  subject: "Fluid Mechanics",
  category: "Buoyancy",
  level: "University",

  formula:
    "F_b = ρgV",

  explanation:
    "Upward force exerted on an object submerged in fluid.",

  variables: [
    { symbol: "F_b", meaning: "buoyant force" },
    { symbol: "ρ", meaning: "fluid density" },
    { symbol: "g", meaning: "gravitational acceleration" },
    { symbol: "V", meaning: "volume displaced" },
  ],

  example:
    "Calculate buoyant force acting on a submerged cube.",
},

{
  id: 76,
  title: "Beam Bending Equation",
  subject: "Civil Engineering",
  category: "Structural Analysis",
  level: "University",

  formula:
    "M/I = σ/y = E/R",

  explanation:
    "Relates bending moment, stress, and curvature in beams.",

  variables: [
    { symbol: "M", meaning: "bending moment" },
    { symbol: "I", meaning: "moment of inertia" },
    { symbol: "σ", meaning: "stress" },
    { symbol: "y", meaning: "distance from neutral axis" },
    { symbol: "E", meaning: "Young's modulus" },
    { symbol: "R", meaning: "radius of curvature" },
  ],

  example:
    "Determine stress in a loaded beam.",
},

{
  id: 77,
  title: "Hooke’s Law",
  subject: "Civil Engineering",
  category: "Elasticity",
  level: "University",

  formula:
    "F = kx",

  explanation:
    "Force exerted by a spring is proportional to displacement.",

  variables: [
    { symbol: "F", meaning: "force" },
    { symbol: "k", meaning: "spring constant" },
    { symbol: "x", meaning: "displacement" },
  ],

  example:
    "Find force needed to stretch a spring by 0.2m.",
},

{
  id: 78,
  title: "Slope Formula",
  subject: "Civil Engineering",
  category: "Surveying",
  level: "University",

  formula:
    "Slope = Rise/Run",

  explanation:
    "Measures steepness or incline of a surface.",

  variables: [
    { symbol: "Rise", meaning: "vertical change" },
    { symbol: "Run", meaning: "horizontal distance" },
  ],

  example:
    "Find slope of a road rising 5m over 100m.",
},

{
  id: 79,
  title: "Shear Stress Formula",
  subject: "Civil Engineering",
  category: "Strength of Materials",
  level: "University",

  formula:
    "τ = F/A",

  explanation:
    "Measures stress parallel to the surface.",

  variables: [
    { symbol: "τ", meaning: "shear stress" },
    { symbol: "F", meaning: "shear force" },
    { symbol: "A", meaning: "area" },
  ],

  example:
    "Calculate shear stress on a bolt.",
},

{
  id: 80,
  title: "Torque Equation",
  subject: "Mechanical Engineering",
  category: "Rotational Mechanics",
  level: "University",

  formula:
    "τ = rF sinθ",

  explanation:
    "Measures turning effect of a force.",

  variables: [
    { symbol: "τ", meaning: "torque" },
    { symbol: "r", meaning: "distance from pivot" },
    { symbol: "F", meaning: "force" },
    { symbol: "θ", meaning: "angle" },
  ],

  example:
    "Find torque produced by a wrench.",
},

{
  id: 81,
  title: "Angular Velocity",
  subject: "Mechanical Engineering",
  category: "Rotational Motion",
  level: "University",

  formula:
    "ω = θ/t",

  explanation:
    "Rate of angular displacement.",

  variables: [
    { symbol: "ω", meaning: "angular velocity" },
    { symbol: "θ", meaning: "angular displacement" },
    { symbol: "t", meaning: "time" },
  ],

  example:
    "Determine angular speed of a rotating wheel.",
},

{
  id: 82,
  title: "Centripetal Force",
  subject: "Mechanical Engineering",
  category: "Circular Motion",
  level: "University",

  formula:
    "F = mv²/r",

  explanation:
    "Force required to keep an object moving in a circle.",

  variables: [
    { symbol: "m", meaning: "mass" },
    { symbol: "v", meaning: "velocity" },
    { symbol: "r", meaning: "radius" },
  ],

  example:
    "Find force acting on a car turning a bend.",
},

{
  id: 83,
  title: "Angular Momentum",
  subject: "Mechanical Engineering",
  category: "Rotational Dynamics",
  level: "University",

  formula:
    "L = Iω",

  explanation:
    "Rotational equivalent of linear momentum.",

  variables: [
    { symbol: "L", meaning: "angular momentum" },
    { symbol: "I", meaning: "moment of inertia" },
    { symbol: "ω", meaning: "angular velocity" },
  ],

  example:
    "Calculate angular momentum of a spinning disc.",
},

{
  id: 84,
  title: "Moment of Inertia",
  subject: "Mechanical Engineering",
  category: "Rotational Dynamics",
  level: "University",

  formula:
    "I = mr²",

  explanation:
    "Measures resistance to rotational acceleration.",

  variables: [
    { symbol: "I", meaning: "moment of inertia" },
    { symbol: "m", meaning: "mass" },
    { symbol: "r", meaning: "radius" },
  ],

  example:
    "Determine inertia of a rotating particle.",
},

{
  id: 85,
  title: "Wave Speed Equation",
  subject: "Physics",
  category: "Waves",
  level: "University",

  formula:
    "v = fλ",

  explanation:
    "Relates wave speed, frequency, and wavelength.",

  variables: [
    { symbol: "v", meaning: "wave speed" },
    { symbol: "f", meaning: "frequency" },
    { symbol: "λ", meaning: "wavelength" },
  ],

  example:
    "Find wave speed when frequency is 50Hz and wavelength is 2m.",
},

{
  id: 86,
  title: "Coulomb’s Law",
  subject: "Physics",
  category: "Electrostatics",
  level: "University",

  formula:
    "F = kq₁q₂/r²",

  explanation:
    "Force between two electric charges.",

  variables: [
    { symbol: "F", meaning: "electrostatic force" },
    { symbol: "k", meaning: "Coulomb constant" },
    { symbol: "q₁", meaning: "first charge" },
    { symbol: "q₂", meaning: "second charge" },
    { symbol: "r", meaning: "distance between charges" },
  ],

  example:
    "Calculate force between two charges separated by 0.5m.",
},

{
  id: 87,
  title: "Electric Field Strength",
  subject: "Physics",
  category: "Electrostatics",
  level: "University",

  formula:
    "E = F/q",

  explanation:
    "Force experienced per unit charge.",

  variables: [
    { symbol: "E", meaning: "electric field strength" },
    { symbol: "F", meaning: "force" },
    { symbol: "q", meaning: "charge" },
  ],

  example:
    "Find electric field acting on a charge.",
},

{
  id: 88,
  title: "Magnetic Force",
  subject: "Physics",
  category: "Magnetism",
  level: "University",

  formula:
    "F = qvB sinθ",

  explanation:
    "Force acting on a moving charge in a magnetic field.",

  variables: [
    { symbol: "q", meaning: "charge" },
    { symbol: "v", meaning: "velocity" },
    { symbol: "B", meaning: "magnetic field strength" },
    { symbol: "θ", meaning: "angle" },
  ],

  example:
    "Determine force on an electron moving in a magnetic field.",
},

{
  id: 89,
  title: "Faraday’s Law",
  subject: "Physics",
  category: "Electromagnetic Induction",
  level: "University",

  formula:
    "ε = -dΦ/dt",

  explanation:
    "Induced emf equals rate of change of magnetic flux.",

  variables: [
    { symbol: "ε", meaning: "induced emf" },
    { symbol: "Φ", meaning: "magnetic flux" },
    { symbol: "t", meaning: "time" },
  ],

  example:
    "Calculate emf induced in a coil.",
},

{
  id: 90,
  title: "Snell’s Law",
  subject: "Physics",
  category: "Optics",
  level: "University",

  formula:
    "n₁ sinθ₁ = n₂ sinθ₂",

  explanation:
    "Describes refraction of light between media.",

  variables: [
    { symbol: "n₁", meaning: "refractive index of first medium" },
    { symbol: "θ₁", meaning: "incident angle" },
    { symbol: "n₂", meaning: "refractive index of second medium" },
    { symbol: "θ₂", meaning: "refracted angle" },
  ],

  example:
    "Find refracted angle when light enters water.",
},
{
  id: 151,
  title: "Fourier Series",
  subject: "Engineering Mathematics",
  category: "Fourier Analysis",
  level: "University",

  formula:
    "f(x) = a₀/2 + Σ(aₙcos(nx) + bₙsin(nx))",

  explanation:
    "Represents periodic functions as sums of sine and cosine waves.",

  variables: [
    { symbol: "a₀", meaning: "average coefficient" },
    { symbol: "aₙ", meaning: "cosine coefficients" },
    { symbol: "bₙ", meaning: "sine coefficients" },
    { symbol: "n", meaning: "harmonic number" },
  ],

  example:
    "Used in vibration and signal analysis.",
},

{
  id: 152,
  title: "Laplace Transform",
  subject: "Engineering Mathematics",
  category: "Transforms",
  level: "University",

  formula:
    "L{f(t)} = ∫₀∞ e⁻ˢᵗ f(t) dt",

  explanation:
    "Transforms differential equations into algebraic equations.",

  variables: [
    { symbol: "f(t)", meaning: "time-domain function" },
    { symbol: "s", meaning: "complex frequency" },
  ],

  example:
    "Transform e⁻²ᵗ into Laplace domain.",
},

{
  id: 153,
  title: "Inverse Laplace Transform",
  subject: "Engineering Mathematics",
  category: "Transforms",
  level: "University",

  formula:
    "f(t) = L⁻¹{F(s)}",

  explanation:
    "Converts Laplace-domain equations back to time domain.",

  variables: [
    { symbol: "F(s)", meaning: "Laplace function" },
    { symbol: "f(t)", meaning: "time-domain function" },
  ],

  example:
    "Find inverse transform of 1/(s+2).",
},

{
  id: 154,
  title: "Taylor Series",
  subject: "Engineering Mathematics",
  category: "Series Expansion",
  level: "University",

  formula:
    "f(x) = f(a) + f'(a)(x-a) + f''(a)(x-a)²/2! + ...",

  explanation:
    "Approximates functions using infinite polynomial expansions.",

  variables: [
    { symbol: "f(a)", meaning: "function value at a" },
    { symbol: "f'(a)", meaning: "first derivative" },
  ],

  example:
    "Approximate sin(x) around x = 0.",
},

{
  id: 155,
  title: "Maclaurin Series",
  subject: "Engineering Mathematics",
  category: "Series Expansion",
  level: "University",

  formula:
    "f(x) = f(0) + f'(0)x + f''(0)x²/2! + ...",

  explanation:
    "Taylor series centered at zero.",

  variables: [
    { symbol: "x", meaning: "independent variable" },
  ],

  example:
    "Expand eˣ as a power series.",
},

{
  id: 156,
  title: "Gradient of Scalar Field",
  subject: "Engineering Mathematics",
  category: "Vector Calculus",
  level: "University",

  formula:
    "∇f = (∂f/∂x)i + (∂f/∂y)j + (∂f/∂z)k",

  explanation:
    "Measures rate and direction of maximum increase.",

  variables: [
    { symbol: "∇f", meaning: "gradient vector" },
    { symbol: "f", meaning: "scalar field" },
  ],

  example:
    "Find gradient of temperature field.",
},

{
  id: 157,
  title: "Divergence",
  subject: "Engineering Mathematics",
  category: "Vector Calculus",
  level: "University",

  formula:
    "∇ · F = ∂Fₓ/∂x + ∂Fᵧ/∂y + ∂F_z/∂z",

  explanation:
    "Measures outward flux density of a vector field.",

  variables: [
    { symbol: "F", meaning: "vector field" },
  ],

  example:
    "Compute divergence of fluid velocity.",
},

{
  id: 158,
  title: "Curl",
  subject: "Engineering Mathematics",
  category: "Vector Calculus",
  level: "University",

  formula:
    "∇ × F",

  explanation:
    "Measures rotational tendency of a vector field.",

  variables: [
    { symbol: "F", meaning: "vector field" },
  ],

  example:
    "Find curl of electromagnetic field.",
},

{
  id: 159,
  title: "Green's Theorem",
  subject: "Engineering Mathematics",
  category: "Vector Calculus",
  level: "University",

  formula:
    "∮C (Ldx + Mdy) = ∬R (∂M/∂x - ∂L/∂y)dA",

  explanation:
    "Relates line integrals to double integrals.",

  variables: [
    { symbol: "L, M", meaning: "scalar functions" },
  ],

  example:
    "Evaluate circulation around a curve.",
},

{
  id: 160,
  title: "Stokes' Theorem",
  subject: "Engineering Mathematics",
  category: "Vector Calculus",
  level: "University",

  formula:
    "∮C F·dr = ∬S (∇ × F)·dS",

  explanation:
    "Relates circulation around boundary to curl over surface.",

  variables: [
    { symbol: "F", meaning: "vector field" },
  ],

  example:
    "Calculate magnetic circulation.",
},

{
  id: 161,
  title: "Gauss Divergence Theorem",
  subject: "Engineering Mathematics",
  category: "Vector Calculus",
  level: "University",

  formula:
    "∭V (∇ · F)dV = ∬S F·dS",

  explanation:
    "Relates divergence within volume to flux through surface.",

  variables: [
    { symbol: "F", meaning: "vector field" },
  ],

  example:
    "Determine total outward flux.",
},

{
  id: 162,
  title: "Eigenvalue Equation",
  subject: "Engineering Mathematics",
  category: "Linear Algebra",
  level: "University",

  formula:
    "A𝑥 = λ𝑥",

  explanation:
    "Defines eigenvalues and eigenvectors of a matrix.",

  variables: [
    { symbol: "A", meaning: "matrix" },
    { symbol: "λ", meaning: "eigenvalue" },
    { symbol: "x", meaning: "eigenvector" },
  ],

  example:
    "Find eigenvalues of 2×2 matrix.",
},

{
  id: 163,
  title: "Determinant of 2×2 Matrix",
  subject: "Engineering Mathematics",
  category: "Linear Algebra",
  level: "University",

  formula:
    "|A| = ad - bc",

  explanation:
    "Computes determinant of a 2×2 matrix.",

  variables: [
    { symbol: "a,b,c,d", meaning: "matrix entries" },
  ],

  example:
    "Find determinant of [[2,3],[1,4]].",
},

{
  id: 164,
  title: "Matrix Inverse",
  subject: "Engineering Mathematics",
  category: "Linear Algebra",
  level: "University",

  formula:
    "A⁻¹ = adj(A)/|A|",

  explanation:
    "Calculates inverse of a square matrix.",

  variables: [
    { symbol: "adj(A)", meaning: "adjoint matrix" },
    { symbol: "|A|", meaning: "determinant" },
  ],

  example:
    "Find inverse of 2×2 matrix.",
},

{
  id: 165,
  title: "Binomial Distribution",
  subject: "Engineering Mathematics",
  category: "Probability",
  level: "University",

  formula:
    "P(X=k) = nCk pᵏ(1-p)ⁿ⁻ᵏ",

  explanation:
    "Probability of exactly k successes in n trials.",

  variables: [
    { symbol: "n", meaning: "number of trials" },
    { symbol: "p", meaning: "success probability" },
  ],

  example:
    "Probability of getting 3 heads in 5 tosses.",
},

{
  id: 166,
  title: "Poisson Distribution",
  subject: "Engineering Mathematics",
  category: "Probability",
  level: "University",

  formula:
    "P(X=k) = (λᵏe⁻ˡ)/k!",

  explanation:
    "Models rare random events.",

  variables: [
    { symbol: "λ", meaning: "average rate" },
  ],

  example:
    "Find probability of 2 calls per minute.",
},

{
  id: 167,
  title: "Normal Distribution",
  subject: "Engineering Mathematics",
  category: "Statistics",
  level: "University",

  formula:
    "f(x) = (1/σ√2π)e^(-(x-μ)²/2σ²)",

  explanation:
    "Probability density function of Gaussian distribution.",

  variables: [
    { symbol: "μ", meaning: "mean" },
    { symbol: "σ", meaning: "standard deviation" },
  ],

  example:
    "Find probability within one standard deviation.",
},

{
  id: 168,
  title: "Z-Score",
  subject: "Engineering Mathematics",
  category: "Statistics",
  level: "University",

  formula:
    "z = (x - μ)/σ",

  explanation:
    "Measures how many standard deviations a value is from the mean.",

  variables: [
    { symbol: "x", meaning: "observed value" },
    { symbol: "μ", meaning: "mean" },
    { symbol: "σ", meaning: "standard deviation" },
  ],

  example:
    "Calculate z-score for score 80.",
},

{
  id: 169,
  title: "Correlation Coefficient",
  subject: "Engineering Mathematics",
  category: "Statistics",
  level: "University",

  formula:
    "r = Σ[(x-ẍ)(y-ẏ)] / √[Σ(x-ẍ)²Σ(y-ẏ)²]",

  explanation:
    "Measures linear relationship between variables.",

  variables: [
    { symbol: "r", meaning: "correlation coefficient" },
  ],

  example:
    "Determine correlation between study time and scores.",
},

{
  id: 170,
  title: "Regression Equation",
  subject: "Engineering Mathematics",
  category: "Statistics",
  level: "University",

  formula:
    "y = a + bx",

  explanation:
    "Linear regression model for prediction.",

  variables: [
    { symbol: "a", meaning: "intercept" },
    { symbol: "b", meaning: "slope" },
  ],

  example:
    "Predict sales based on advertising.",
},

{
  id: 171,
  title: "Hooke's Law",
  subject: "Mechanics",
  category: "Elasticity",
  level: "University",

  formula:
    "F = -kx",

  explanation:
    "Restoring force is proportional to displacement.",

  variables: [
    { symbol: "F", meaning: "restoring force" },
    { symbol: "k", meaning: "spring constant" },
    { symbol: "x", meaning: "displacement" },
  ],

  example:
    "Find spring force for extension 0.2m.",
},

{
  id: 172,
  title: "Stress Formula",
  subject: "Mechanics",
  category: "Strength of Materials",
  level: "University",

  formula:
    "σ = F/A",

  explanation:
    "Stress equals force per unit area.",

  variables: [
    { symbol: "σ", meaning: "stress" },
    { symbol: "F", meaning: "force" },
    { symbol: "A", meaning: "cross-sectional area" },
  ],

  example:
    "Calculate stress on steel rod.",
},

{
  id: 173,
  title: "Strain Formula",
  subject: "Mechanics",
  category: "Strength of Materials",
  level: "University",

  formula:
    "ε = ΔL/L",

  explanation:
    "Strain is deformation divided by original length.",

  variables: [
    { symbol: "ΔL", meaning: "change in length" },
    { symbol: "L", meaning: "original length" },
  ],

  example:
    "Find strain in stretched wire.",
},

{
  id: 174,
  title: "Young's Modulus",
  subject: "Mechanics",
  category: "Elasticity",
  level: "University",

  formula:
    "E = σ/ε",

  explanation:
    "Ratio of stress to strain.",

  variables: [
    { symbol: "σ", meaning: "stress" },
    { symbol: "ε", meaning: "strain" },
  ],

  example:
    "Determine elasticity of material.",
},

{
  id: 175,
  title: "Torque Formula",
  subject: "Mechanics",
  category: "Rotational Motion",
  level: "University",

  formula:
    "τ = rFsinθ",

  explanation:
    "Torque produced by a force acting at distance r.",

  variables: [
    { symbol: "τ", meaning: "torque" },
    { symbol: "r", meaning: "radius" },
    { symbol: "F", meaning: "force" },
  ],

  example:
    "Find torque on a wrench.",
},
{
  id: 176,
  title: "Angular Velocity",
  subject: "Mechanics",
  category: "Rotational Motion",
  level: "University",

  formula:
    "ω = θ/t",

  explanation:
    "Angular displacement per unit time.",

  variables: [
    { symbol: "ω", meaning: "angular velocity" },
    { symbol: "θ", meaning: "angular displacement" },
    { symbol: "t", meaning: "time" },
  ],

  example:
    "Find angular velocity after rotating 6 radians in 2 seconds.",
},

{
  id: 177,
  title: "Angular Acceleration",
  subject: "Mechanics",
  category: "Rotational Motion",
  level: "University",

  formula:
    "α = Δω/Δt",

  explanation:
    "Rate of change of angular velocity.",

  variables: [
    { symbol: "α", meaning: "angular acceleration" },
    { symbol: "Δω", meaning: "change in angular velocity" },
    { symbol: "Δt", meaning: "change in time" },
  ],

  example:
    "Calculate angular acceleration of a spinning wheel.",
},

{
  id: 178,
  title: "Rotational Kinetic Energy",
  subject: "Mechanics",
  category: "Rotational Motion",
  level: "University",

  formula:
    "KE = 1/2 Iω²",

  explanation:
    "Energy possessed by a rotating object.",

  variables: [
    { symbol: "I", meaning: "moment of inertia" },
    { symbol: "ω", meaning: "angular velocity" },
  ],

  example:
    "Find kinetic energy of a rotating disk.",
},

{
  id: 179,
  title: "Moment of Inertia",
  subject: "Mechanics",
  category: "Rotational Motion",
  level: "University",

  formula:
    "I = mr²",

  explanation:
    "Resistance of a body to rotational acceleration.",

  variables: [
    { symbol: "m", meaning: "mass" },
    { symbol: "r", meaning: "radius" },
  ],

  example:
    "Determine inertia of a particle rotating about an axis.",
},

{
  id: 180,
  title: "Centripetal Force",
  subject: "Mechanics",
  category: "Circular Motion",
  level: "University",

  formula:
    "F = mv²/r",

  explanation:
    "Force required to keep an object moving in a circle.",

  variables: [
    { symbol: "m", meaning: "mass" },
    { symbol: "v", meaning: "velocity" },
    { symbol: "r", meaning: "radius" },
  ],

  example:
    "Find force acting on a car turning a bend.",
},

{
  id: 181,
  title: "Centripetal Acceleration",
  subject: "Mechanics",
  category: "Circular Motion",
  level: "University",

  formula:
    "a = v²/r",

  explanation:
    "Acceleration directed toward the center of a circle.",

  variables: [
    { symbol: "v", meaning: "velocity" },
    { symbol: "r", meaning: "radius" },
  ],

  example:
    "Calculate acceleration of a rotating object.",
},

{
  id: 182,
  title: "Impulse Formula",
  subject: "Mechanics",
  category: "Momentum",
  level: "University",

  formula:
    "J = Ft",

  explanation:
    "Impulse equals force multiplied by time.",

  variables: [
    { symbol: "J", meaning: "impulse" },
    { symbol: "F", meaning: "force" },
    { symbol: "t", meaning: "time" },
  ],

  example:
    "Find impulse applied over 3 seconds.",
},

{
  id: 183,
  title: "Momentum Formula",
  subject: "Mechanics",
  category: "Momentum",
  level: "University",

  formula:
    "p = mv",

  explanation:
    "Momentum equals mass times velocity.",

  variables: [
    { symbol: "p", meaning: "momentum" },
    { symbol: "m", meaning: "mass" },
    { symbol: "v", meaning: "velocity" },
  ],

  example:
    "Calculate momentum of a moving truck.",
},

{
  id: 184,
  title: "Work Done",
  subject: "Mechanics",
  category: "Energy",
  level: "University",

  formula:
    "W = Fdcosθ",

  explanation:
    "Work done by a force over displacement.",

  variables: [
    { symbol: "F", meaning: "force" },
    { symbol: "d", meaning: "displacement" },
    { symbol: "θ", meaning: "angle between force and displacement" },
  ],

  example:
    "Find work done pulling an object.",
},

{
  id: 185,
  title: "Power Formula",
  subject: "Mechanics",
  category: "Energy",
  level: "University",

  formula:
    "P = W/t",

  explanation:
    "Power is the rate of doing work.",

  variables: [
    { symbol: "P", meaning: "power" },
    { symbol: "W", meaning: "work done" },
    { symbol: "t", meaning: "time" },
  ],

  example:
    "Calculate machine power output.",
},

{
  id: 186,
  title: "Gravitational Potential Energy",
  subject: "Mechanics",
  category: "Energy",
  level: "University",

  formula:
    "PE = mgh",

  explanation:
    "Energy stored due to height above ground.",

  variables: [
    { symbol: "m", meaning: "mass" },
    { symbol: "g", meaning: "gravitational acceleration" },
    { symbol: "h", meaning: "height" },
  ],

  example:
    "Find energy of object lifted 5m high.",
},

{
  id: 187,
  title: "Kinetic Energy",
  subject: "Mechanics",
  category: "Energy",
  level: "University",

  formula:
    "KE = 1/2 mv²",

  explanation:
    "Energy possessed by moving objects.",

  variables: [
    { symbol: "m", meaning: "mass" },
    { symbol: "v", meaning: "velocity" },
  ],

  example:
    "Calculate kinetic energy of a car.",
},

{
  id: 188,
  title: "Bernoulli Equation",
  subject: "Fluid Mechanics",
  category: "Fluid Flow",
  level: "University",

  formula:
    "P + 1/2ρv² + ρgh = constant",

  explanation:
    "Conservation of energy in fluid flow.",

  variables: [
    { symbol: "P", meaning: "pressure" },
    { symbol: "ρ", meaning: "fluid density" },
    { symbol: "v", meaning: "velocity" },
    { symbol: "h", meaning: "height" },
  ],

  example:
    "Determine pressure difference in flowing fluid.",
},

{
  id: 189,
  title: "Continuity Equation",
  subject: "Fluid Mechanics",
  category: "Fluid Flow",
  level: "University",

  formula:
    "A₁v₁ = A₂v₂",

  explanation:
    "Mass conservation in incompressible fluid flow.",

  variables: [
    { symbol: "A", meaning: "cross-sectional area" },
    { symbol: "v", meaning: "fluid velocity" },
  ],

  example:
    "Find velocity through narrow pipe.",
},

{
  id: 190,
  title: "Pascal's Law",
  subject: "Fluid Mechanics",
  category: "Pressure",
  level: "University",

  formula:
    "P = F/A",

  explanation:
    "Pressure applied to enclosed fluid is transmitted equally.",

  variables: [
    { symbol: "P", meaning: "pressure" },
    { symbol: "F", meaning: "force" },
    { symbol: "A", meaning: "area" },
  ],

  example:
    "Calculate hydraulic lift pressure.",
},

{
  id: 191,
  title: "Buoyant Force",
  subject: "Fluid Mechanics",
  category: "Buoyancy",
  level: "University",

  formula:
    "F_b = ρgV",

  explanation:
    "Upward force exerted by fluid on immersed body.",

  variables: [
    { symbol: "ρ", meaning: "fluid density" },
    { symbol: "g", meaning: "gravitational acceleration" },
    { symbol: "V", meaning: "volume displaced" },
  ],

  example:
    "Find buoyant force on submerged object.",
},

{
  id: 192,
  title: "Reynolds Number",
  subject: "Fluid Mechanics",
  category: "Fluid Flow",
  level: "University",

  formula:
    "Re = ρvD/μ",

  explanation:
    "Predicts laminar or turbulent flow.",

  variables: [
    { symbol: "ρ", meaning: "density" },
    { symbol: "v", meaning: "velocity" },
    { symbol: "D", meaning: "diameter" },
    { symbol: "μ", meaning: "viscosity" },
  ],

  example:
    "Determine whether pipe flow is turbulent.",
},

{
  id: 193,
  title: "Heat Transfer Equation",
  subject: "Thermodynamics",
  category: "Heat Transfer",
  level: "University",

  formula:
    "Q = mcΔT",

  explanation:
    "Heat energy required to change temperature.",

  variables: [
    { symbol: "m", meaning: "mass" },
    { symbol: "c", meaning: "specific heat capacity" },
    { symbol: "ΔT", meaning: "temperature change" },
  ],

  example:
    "Find heat required to warm water.",
},

{
  id: 194,
  title: "First Law of Thermodynamics",
  subject: "Thermodynamics",
  category: "Laws of Thermodynamics",
  level: "University",

  formula:
    "ΔU = Q - W",

  explanation:
    "Energy conservation in thermodynamic systems.",

  variables: [
    { symbol: "ΔU", meaning: "change in internal energy" },
    { symbol: "Q", meaning: "heat supplied" },
    { symbol: "W", meaning: "work done" },
  ],

  example:
    "Calculate internal energy change.",
},

{
  id: 195,
  title: "Ideal Gas Equation",
  subject: "Thermodynamics",
  category: "Gas Laws",
  level: "University",

  formula:
    "PV = nRT",

  explanation:
    "Relates pressure, volume, and temperature of gases.",

  variables: [
    { symbol: "P", meaning: "pressure" },
    { symbol: "V", meaning: "volume" },
    { symbol: "n", meaning: "moles" },
    { symbol: "R", meaning: "gas constant" },
    { symbol: "T", meaning: "temperature" },
  ],

  example:
    "Determine gas pressure at fixed temperature.",
},

{
  id: 196,
  title: "Efficiency of Heat Engine",
  subject: "Thermodynamics",
  category: "Heat Engines",
  level: "University",

  formula:
    "η = W/Q_h",

  explanation:
    "Ratio of useful work output to heat input.",

  variables: [
    { symbol: "η", meaning: "efficiency" },
    { symbol: "W", meaning: "work output" },
    { symbol: "Q_h", meaning: "heat supplied" },
  ],

  example:
    "Calculate engine efficiency.",
},

{
  id: 197,
  title: "Carnot Efficiency",
  subject: "Thermodynamics",
  category: "Heat Engines",
  level: "University",

  formula:
    "η = 1 - T_c/T_h",

  explanation:
    "Maximum possible efficiency of a heat engine.",

  variables: [
    { symbol: "T_c", meaning: "cold reservoir temperature" },
    { symbol: "T_h", meaning: "hot reservoir temperature" },
  ],

  example:
    "Find ideal efficiency between two temperatures.",
},

{
  id: 198,
  title: "Entropy Change",
  subject: "Thermodynamics",
  category: "Entropy",
  level: "University",

  formula:
    "ΔS = Q/T",

  explanation:
    "Measures disorder or randomness in a system.",

  variables: [
    { symbol: "ΔS", meaning: "entropy change" },
    { symbol: "Q", meaning: "heat transferred" },
    { symbol: "T", meaning: "temperature" },
  ],

  example:
    "Calculate entropy increase during heating.",
},

{
  id: 199,
  title: "Stefan-Boltzmann Law",
  subject: "Thermodynamics",
  category: "Radiation",
  level: "University",

  formula:
    "P = σAT⁴",

  explanation:
    "Radiated power emitted by a black body.",

  variables: [
    { symbol: "σ", meaning: "Stefan-Boltzmann constant" },
    { symbol: "A", meaning: "surface area" },
    { symbol: "T", meaning: "temperature" },
  ],

  example:
    "Find heat radiated from hot object.",
},

{
  id: 200,
  title: "Wien's Displacement Law",
  subject: "Thermodynamics",
  category: "Radiation",
  level: "University",

  formula:
    "λ_max T = constant",

  explanation:
    "Peak wavelength inversely proportional to temperature.",

  variables: [
    { symbol: "λ_max", meaning: "peak wavelength" },
    { symbol: "T", meaning: "absolute temperature" },
  ],

  example:
    "Determine color emitted by hot metal.",
},
  {
    id: 201,
    title: "Quadratic Formula",
    subject: "Mathematics",
    category: "Algebra",
    level: "Foundation",

    formula:
      "x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}",

    explanation:
      "Used for solving quadratic equations.",

    variables: [
      { symbol: "a", meaning: "coefficient of x²" },
      { symbol: "b", meaning: "coefficient of x" },
      { symbol: "c", meaning: "constant" },
    ],

    example:
      "Solve x² + 5x + 6 = 0",
  },

  {
    id: 202,
    title: "Pythagorean Theorem",
    subject: "Mathematics",
    category: "Geometry",
    level: "Foundation",

    formula:
      "a^2 + b^2 = c^2",

    explanation:
      "Relationship between the sides of a right triangle.",

    variables: [
      { symbol: "a", meaning: "adjacent side" },
      { symbol: "b", meaning: "opposite side" },
      { symbol: "c", meaning: "hypotenuse" },
    ],

    example:
      "Find c when a = 3 and b = 4",
  },

  {
    id: 203,
    title: "Area of Circle",
    subject: "Mathematics",
    category: "Geometry",
    level: "Foundation",

    formula:
      "A = \\pi r^2",

    explanation:
      "Used to calculate the area of a circle.",

    variables: [
      { symbol: "A", meaning: "area" },
      { symbol: "r", meaning: "radius" },
    ],

    example:
      "Find area when r = 7cm",
  },

  {
    id: 204,
    title: "Slope Formula",
    subject: "Mathematics",
    category: "Coordinate Geometry",
    level: "University",

    formula:
      "m = \\frac{y_2 - y_1}{x_2 - x_1}",

    explanation:
      "Used to calculate slope between two points.",

    variables: [
      { symbol: "m", meaning: "slope" },
      { symbol: "x_1", meaning: "first x-coordinate" },
      { symbol: "x_2", meaning: "second x-coordinate" },
      { symbol: "y_1", meaning: "first y-coordinate" },
      { symbol: "y_2", meaning: "second y-coordinate" },
    ],

    example:
      "Find slope between (2,3) and (5,9)",
  },

  {
    id: 205,
    title: "Simple Interest",
    subject: "Mathematics",
    category: "Financial Maths",
    level: "Foundation",

    formula:
      "SI = \\frac{PRT}{100}",

    explanation:
      "Used to calculate simple interest.",

    variables: [
      { symbol: "P", meaning: "principal" },
      { symbol: "R", meaning: "rate" },
      { symbol: "T", meaning: "time" },
    ],

    example:
      "Find SI when P = 1000, R = 5%, T = 2",
  },

  {
    id: 206,
    title: "Ohm's Law",
    subject: "Physics",
    category: "Electricity",
    level: "Foundation",

    formula:
      "V = IR",

    explanation:
      "Relationship between voltage, current and resistance.",

    variables: [
      { symbol: "V", meaning: "voltage" },
      { symbol: "I", meaning: "current" },
      { symbol: "R", meaning: "resistance" },
    ],

    example:
      "Find voltage when I = 2A and R = 5Ω",
  },

  {
    id: 207,
    title: "Newton's Second Law",
    subject: "Physics",
    category: "Mechanics",
    level: "WAEC",

    formula:
      "F = ma",

    explanation:
      "Force equals mass multiplied by acceleration.",

    variables: [
      { symbol: "F", meaning: "force" },
      { symbol: "m", meaning: "mass" },
      { symbol: "a", meaning: "acceleration" },
    ],

    example:
      "Find force when m = 5kg and a = 2m/s²",
  },

  {
    id: 208,
    title: "Kinetic Energy",
    subject: "Physics",
    category: "Energy",
    level: "University",

    formula:
      "KE = \\frac{1}{2}mv^2",

    explanation:
      "Energy possessed by a moving body.",

    variables: [
      { symbol: "m", meaning: "mass" },
      { symbol: "v", meaning: "velocity" },
    ],

    example:
      "Find KE of a 2kg object moving at 4m/s",
  },

  {
    id: 209,
    title: "Momentum Formula",
    subject: "Physics",
    category: "Mechanics",
    level: "WAEC",

    formula:
      "p = mv",

    explanation:
      "Momentum equals mass multiplied by velocity.",

    variables: [
      { symbol: "p", meaning: "momentum" },
      { symbol: "m", meaning: "mass" },
      { symbol: "v", meaning: "velocity" },
    ],

    example:
      "Find momentum when m = 4kg and v = 3m/s",
  },

  {
    id: 210,
    title: "Wien's Displacement Law",
    subject: "Physics",
    category: "Radiation",
    level: "University",

    formula:
      "λ_{max} T = constant",

    explanation:
      "Peak wavelength inversely proportional to temperature.",

    variables: [
      { symbol: "λ_max", meaning: "peak wavelength" },
      { symbol: "T", meaning: "absolute temperature" },
    ],

    example:
      "Determine color emitted by hot metal.",
  },
    {
    id: 211,
    title: "Potential Energy",
    subject: "Physics",
    category: "Energy",
    level: "University",

    formula:
      "PE = mgh",

    explanation:
      "Energy possessed due to height above ground.",

    variables: [
      { symbol: "m", meaning: "mass" },
      { symbol: "g", meaning: "gravitational acceleration" },
      { symbol: "h", meaning: "height" },
    ],

    example:
      "Find PE when m = 2kg, h = 5m",
  },

  {
    id: 212,
    title: "Speed Formula",
    subject: "Physics",
    category: "Motion",
    level: "Foundation",

    formula:
      "Speed = \\frac{Distance}{Time}",

    explanation:
      "Calculates speed of a moving object.",

    variables: [
      { symbol: "Distance", meaning: "distance travelled" },
      { symbol: "Time", meaning: "time taken" },
    ],

    example:
      "Find speed if distance = 100m and time = 20s",
  },

  {
    id: 213,
    title: "Density Formula",
    subject: "Physics",
    category: "Matter",
    level: "WAEC",

    formula:
      "\\rho = \\frac{m}{V}",

    explanation:
      "Density equals mass divided by volume.",

    variables: [
      { symbol: "\\rho", meaning: "density" },
      { symbol: "m", meaning: "mass" },
      { symbol: "V", meaning: "volume" },
    ],

    example:
      "Find density when mass = 20kg and volume = 5m³",
  },

  {
    id: 214,
    title: "Pressure Formula",
    subject: "Physics",
    category: "Mechanics",
    level: "Foundation",

    formula:
      "P = \\frac{F}{A}",

    explanation:
      "Pressure equals force divided by area.",

    variables: [
      { symbol: "P", meaning: "pressure" },
      { symbol: "F", meaning: "force" },
      { symbol: "A", meaning: "area" },
    ],

    example:
      "Find pressure when F = 50N and A = 5m²",
  },

  {
    id: 215,
    title: "Power Formula",
    subject: "Physics",
    category: "Energy",
    level: "WAEC",

    formula:
      "P = \\frac{W}{t}",

    explanation:
      "Power equals work done divided by time.",

    variables: [
      { symbol: "P", meaning: "power" },
      { symbol: "W", meaning: "work done" },
      { symbol: "t", meaning: "time" },
    ],

    example:
      "Find power if W = 200J and t = 10s",
  },

  {
    id: 216,
    title: "Work Done",
    subject: "Physics",
    category: "Mechanics",
    level: "Foundation",

    formula:
      "W = Fs",

    explanation:
      "Work done equals force multiplied by distance.",

    variables: [
      { symbol: "W", meaning: "work done" },
      { symbol: "F", meaning: "force" },
      { symbol: "s", meaning: "distance" },
    ],

    example:
      "Find work done when F = 10N and s = 5m",
  },

  {
    id: 217,
    title: "Circumference of Circle",
    subject: "Mathematics",
    category: "Geometry",
    level: "Foundation",

    formula:
      "C = 2\\pi r",

    explanation:
      "Used to calculate circumference of a circle.",

    variables: [
      { symbol: "C", meaning: "circumference" },
      { symbol: "r", meaning: "radius" },
    ],

    example:
      "Find circumference when r = 7cm",
  },

  {
    id: 218,
    title: "Area of Triangle",
    subject: "Mathematics",
    category: "Geometry",
    level: "WAEC",

    formula:
      "A = \\frac{1}{2}bh",

    explanation:
      "Area equals half base multiplied by height.",

    variables: [
      { symbol: "b", meaning: "base" },
      { symbol: "h", meaning: "height" },
    ],

    example:
      "Find area when b = 10cm and h = 8cm",
  },

  {
    id: 219,
    title: "Volume of Cylinder",
    subject: "Mathematics",
    category: "Mensuration",
    level: "University",

    formula:
      "V = \\pi r^2 h",

    explanation:
      "Calculates volume of a cylinder.",

    variables: [
      { symbol: "V", meaning: "volume" },
      { symbol: "r", meaning: "radius" },
      { symbol: "h", meaning: "height" },
    ],

    example:
      "Find volume when r = 3cm and h = 10cm",
  },

  {
    id: 220,
    title: "Trigonometric Identity",
    subject: "Mathematics",
    category: "Trigonometry",
    level: "University",

    formula:
      "\\sin^2\\theta + \\cos^2\\theta = 1",

    explanation:
      "Fundamental trigonometric identity.",

    variables: [
      { symbol: "\\theta", meaning: "angle" },
    ],

    example:
      "Verify identity for θ = 45°",
  },
    {
    id: 221,
    title: "Probability Formula",
    subject: "Mathematics",
    category: "Probability",
    level: "WAEC",

    formula:
      "P(E) = \\frac{n(E)}{n(S)}",

    explanation:
      "Probability equals favorable outcomes over total outcomes.",

    variables: [
      { symbol: "P(E)", meaning: "probability of event E" },
      { symbol: "n(E)", meaning: "number of favorable outcomes" },
      { symbol: "n(S)", meaning: "total sample space" },
    ],

    example:
      "Find probability of getting a head from a coin toss",
  },

  {
    id: 222,
    title: "Mean Formula",
    subject: "Mathematics",
    category: "Statistics",
    level: "Foundation",

    formula:
      "\\bar{x} = \\frac{\\sum x}{n}",

    explanation:
      "Calculates arithmetic mean.",

    variables: [
      { symbol: "\\bar{x}", meaning: "mean" },
      { symbol: "\\sum x", meaning: "sum of observations" },
      { symbol: "n", meaning: "number of observations" },
    ],

    example:
      "Find mean of 2, 4, 6, 8",
  },

  {
    id: 223,
    title: "Compound Interest",
    subject: "Mathematics",
    category: "Financial Maths",
    level: "University",

    formula:
      "A = P\\left(1 + \\frac{r}{n}\\right)^{nt}",

    explanation:
      "Used to calculate compound interest.",

    variables: [
      { symbol: "A", meaning: "final amount" },
      { symbol: "P", meaning: "principal" },
      { symbol: "r", meaning: "interest rate" },
      { symbol: "n", meaning: "times compounded yearly" },
      { symbol: "t", meaning: "time" },
    ],

    example:
      "Find amount after 2 years",
  },

  {
    id: 224,
    title: "Distance Formula",
    subject: "Mathematics",
    category: "Coordinate Geometry",
    level: "University",

    formula:
      "d = \\sqrt{(x_2 - x_1)^2 + (y_2 - y_1)^2}",

    explanation:
      "Calculates distance between two points.",

    variables: [
      { symbol: "d", meaning: "distance" },
      { symbol: "x_1", meaning: "first x-coordinate" },
      { symbol: "x_2", meaning: "second x-coordinate" },
      { symbol: "y_1", meaning: "first y-coordinate" },
      { symbol: "y_2", meaning: "second y-coordinate" },
    ],

    example:
      "Find distance between (1,2) and (4,6)",
  },

  {
    id: 225,
    title: "Acceleration Formula",
    subject: "Physics",
    category: "Motion",
    level: "Foundation",

    formula:
      "a = \\frac{v - u}{t}",

    explanation:
      "Acceleration equals change in velocity over time.",

    variables: [
      { symbol: "a", meaning: "acceleration" },
      { symbol: "v", meaning: "final velocity" },
      { symbol: "u", meaning: "initial velocity" },
      { symbol: "t", meaning: "time" },
    ],

    example:
      "Find acceleration when u=2m/s, v=10m/s, t=4s",
  },

  {
    id: 226,
    title: "Wave Speed Formula",
    subject: "Physics",
    category: "Waves",
    level: "WAEC",

    formula:
      "v = f\\lambda",

    explanation:
      "Wave speed equals frequency multiplied by wavelength.",

    variables: [
      { symbol: "v", meaning: "wave speed" },
      { symbol: "f", meaning: "frequency" },
      { symbol: "\\lambda", meaning: "wavelength" },
    ],

    example:
      "Find speed when f=50Hz and λ=2m",
  },

  {
    id: 227,
    title: "Hooke's Law",
    subject: "Physics",
    category: "Elasticity",
    level: "University",

    formula:
      "F = kx",

    explanation:
      "Force applied to a spring is proportional to extension.",

    variables: [
      { symbol: "F", meaning: "force" },
      { symbol: "k", meaning: "spring constant" },
      { symbol: "x", meaning: "extension" },
    ],

    example:
      "Find force when k=200N/m and x=0.5m",
  },

  {
    id: 228,
    title: "Lens Formula",
    subject: "Physics",
    category: "Optics",
    level: "University",

    formula:
      "\\frac{1}{f} = \\frac{1}{v} + \\frac{1}{u}",

    explanation:
      "Relates focal length, image distance and object distance.",

    variables: [
      { symbol: "f", meaning: "focal length" },
      { symbol: "v", meaning: "image distance" },
      { symbol: "u", meaning: "object distance" },
    ],

    example:
      "Find focal length when u=20cm and v=30cm",
  },

  {
    id: 229,
    title: "Gravitational Force",
    subject: "Physics",
    category: "Gravitation",
    level: "University",

    formula:
      "F = G\\frac{m_1m_2}{r^2}",

    explanation:
      "Force between two masses.",

    variables: [
      { symbol: "F", meaning: "gravitational force" },
      { symbol: "G", meaning: "gravitational constant" },
      { symbol: "m_1", meaning: "first mass" },
      { symbol: "m_2", meaning: "second mass" },
      { symbol: "r", meaning: "distance between masses" },
    ],

    example:
      "Find force between two masses separated by distance",
  },

  {
    id: 230,
    title: "Current Formula",
    subject: "Physics",
    category: "Electricity",
    level: "WAEC",

    formula:
      "I = \\frac{Q}{t}",

    explanation:
      "Current equals charge divided by time.",

    variables: [
      { symbol: "I", meaning: "current" },
      { symbol: "Q", meaning: "charge" },
      { symbol: "t", meaning: "time" },
    ],

    example:
      "Find current when Q=20C and t=5s",
  },
    {
    id: 231,
    title: "Capacitance Formula",
    subject: "Physics",
    category: "Electricity",
    level: "University",

    formula:
      "C = \\frac{Q}{V}",

    explanation:
      "Capacitance equals charge stored per unit voltage.",

    variables: [
      { symbol: "C", meaning: "capacitance" },
      { symbol: "Q", meaning: "charge" },
      { symbol: "V", meaning: "voltage" },
    ],

    example:
      "Find capacitance when Q=10C and V=5V",
  },

  {
    id: 232,
    title: "Coulomb's Law",
    subject: "Physics",
    category: "Electrostatics",
    level: "University",

    formula:
      "F = k\\frac{q_1q_2}{r^2}",

    explanation:
      "Force between two electric charges.",

    variables: [
      { symbol: "F", meaning: "electrostatic force" },
      { symbol: "k", meaning: "electrostatic constant" },
      { symbol: "q_1", meaning: "first charge" },
      { symbol: "q_2", meaning: "second charge" },
      { symbol: "r", meaning: "distance between charges" },
    ],

    example:
      "Find force between two charges separated by distance",
  },

  {
    id: 233,
    title: "Resistivity Formula",
    subject: "Physics",
    category: "Electricity",
    level: "University",

    formula:
      "R = \\rho\\frac{L}{A}",

    explanation:
      "Resistance depends on resistivity, length and area.",

    variables: [
      { symbol: "R", meaning: "resistance" },
      { symbol: "\\rho", meaning: "resistivity" },
      { symbol: "L", meaning: "length" },
      { symbol: "A", meaning: "cross-sectional area" },
    ],

    example:
      "Find resistance of a wire",
  },

  {
    id: 234,
    title: "Escape Velocity",
    subject: "Physics",
    category: "Gravitation",
    level: "University",

    formula:
      "v = \\sqrt{\\frac{2GM}{R}}",

    explanation:
      "Minimum velocity needed to escape a planet.",

    variables: [
      { symbol: "v", meaning: "escape velocity" },
      { symbol: "G", meaning: "gravitational constant" },
      { symbol: "M", meaning: "mass of planet" },
      { symbol: "R", meaning: "radius of planet" },
    ],

    example:
      "Find escape velocity of Earth",
  },

  {
    id: 235,
    title: "Area of Trapezium",
    subject: "Mathematics",
    category: "Geometry",
    level: "WAEC",

    formula:
      "A = \\frac{1}{2}(a+b)h",

    explanation:
      "Area equals half the sum of parallel sides times height.",

    variables: [
      { symbol: "A", meaning: "area" },
      { symbol: "a", meaning: "first parallel side" },
      { symbol: "b", meaning: "second parallel side" },
      { symbol: "h", meaning: "height" },
    ],

    example:
      "Find area when a=5cm, b=9cm, h=4cm",
  },

  {
    id: 236,
    title: "Surface Area of Sphere",
    subject: "Mathematics",
    category: "Mensuration",
    level: "University",

    formula:
      "A = 4\\pi r^2",

    explanation:
      "Calculates surface area of a sphere.",

    variables: [
      { symbol: "A", meaning: "surface area" },
      { symbol: "r", meaning: "radius" },
    ],

    example:
      "Find surface area when r=7cm",
  },

  {
    id: 237,
    title: "Volume of Sphere",
    subject: "Mathematics",
    category: "Mensuration",
    level: "University",

    formula:
      "V = \\frac{4}{3}\\pi r^3",

    explanation:
      "Calculates volume of a sphere.",

    variables: [
      { symbol: "V", meaning: "volume" },
      { symbol: "r", meaning: "radius" },
    ],

    example:
      "Find volume when r=3cm",
  },

  {
    id: 238,
    title: "Binomial Expansion",
    subject: "Mathematics",
    category: "Algebra",
    level: "University",

    formula:
      "(a+b)^2 = a^2 + 2ab + b^2",

    explanation:
      "Expansion of a binomial squared.",

    variables: [
      { symbol: "a", meaning: "first term" },
      { symbol: "b", meaning: "second term" },
    ],

    example:
      "Expand (x+2)^2",
  },

  {
    id: 239,
    title: "Logarithm Law",
    subject: "Mathematics",
    category: "Logarithm",
    level: "WAEC",

    formula:
      "\\log(ab) = \\log a + \\log b",

    explanation:
      "Logarithm of a product equals sum of logarithms.",

    variables: [
      { symbol: "a", meaning: "first value" },
      { symbol: "b", meaning: "second value" },
    ],

    example:
      "Simplify log(2×5)",
  },

  {
    id: 240,
    title: "Permutation Formula",
    subject: "Mathematics",
    category: "Probability",
    level: "University",

    formula:
      "nP_r = \\frac{n!}{(n-r)!}",

    explanation:
      "Calculates arrangements of objects.",

    variables: [
      { symbol: "n", meaning: "total objects" },
      { symbol: "r", meaning: "objects selected" },
    ],

    example:
      "Find permutations of 5 objects taken 2",
  },

  {
    id: 241,
    title: "Combination Formula",
    subject: "Mathematics",
    category: "Probability",
    level: "University",

    formula:
      "nC_r = \\frac{n!}{r!(n-r)!}",

    explanation:
      "Calculates combinations of objects.",

    variables: [
      { symbol: "n", meaning: "total objects" },
      { symbol: "r", meaning: "objects selected" },
    ],

    example:
      "Find combinations of 6 objects taken 3",
  },

  {
    id: 242,
    title: "Exponential Law",
    subject: "Mathematics",
    category: "Algebra",
    level: "Foundation",

    formula:
      "a^m \\times a^n = a^{m+n}",

    explanation:
      "Indices law for multiplication.",

    variables: [
      { symbol: "a", meaning: "base" },
      { symbol: "m", meaning: "first exponent" },
      { symbol: "n", meaning: "second exponent" },
    ],

    example:
      "Simplify x² × x³",
  },

  {
    id: 243,
    title: "Sine Rule",
    subject: "Mathematics",
    category: "Trigonometry",
    level: "University",

    formula:
      "\\frac{a}{\\sin A} = \\frac{b}{\\sin B}",

    explanation:
      "Relates sides and angles of a triangle.",

    variables: [
      { symbol: "a", meaning: "first side" },
      { symbol: "b", meaning: "second side" },
      { symbol: "A", meaning: "first angle" },
      { symbol: "B", meaning: "second angle" },
    ],

    example:
      "Find unknown side using sine rule",
  },

  {
    id: 244,
    title: "Cosine Rule",
    subject: "Mathematics",
    category: "Trigonometry",
    level: "University",

    formula:
      "c^2 = a^2 + b^2 - 2ab\\cos C",

    explanation:
      "Used to solve non-right angled triangles.",

    variables: [
      { symbol: "a", meaning: "first side" },
      { symbol: "b", meaning: "second side" },
      { symbol: "c", meaning: "third side" },
      { symbol: "C", meaning: "included angle" },
    ],

    example:
      "Find side c when a=5, b=7, C=60°",
  },

  {
    id: 245,
    title: "Equation of Circle",
    subject: "Mathematics",
    category: "Coordinate Geometry",
    level: "University",

    formula:
      "(x-h)^2 + (y-k)^2 = r^2",

    explanation:
      "Standard equation of a circle.",

    variables: [
      { symbol: "h", meaning: "x-coordinate of center" },
      { symbol: "k", meaning: "y-coordinate of center" },
      { symbol: "r", meaning: "radius" },
    ],

    example:
      "Find equation of circle with center (2,3) and radius 5",
  },
    {
    id: 246,
    title: "Differentiation Formula",
    subject: "Mathematics",
    category: "Calculus",
    level: "University",

    formula:
      "\\frac{d}{dx}(x^n) = nx^{n-1}",

    explanation:
      "Basic rule for differentiating powers.",

    variables: [
      { symbol: "n", meaning: "power of x" },
      { symbol: "x", meaning: "variable" },
    ],

    example:
      "Differentiate x^5",
  },

  {
    id: 247,
    title: "Integration Formula",
    subject: "Mathematics",
    category: "Calculus",
    level: "University",

    formula:
      "\\int x^n dx = \\frac{x^{n+1}}{n+1} + C",

    explanation:
      "Basic integration formula for powers.",

    variables: [
      { symbol: "n", meaning: "power of x" },
      { symbol: "C", meaning: "constant of integration" },
    ],

    example:
      "Integrate x² dx",
  },

  {
    id: 248,
    title: "Area Under Curve",
    subject: "Mathematics",
    category: "Calculus",
    level: "University",

    formula:
      "A = \\int_a^b f(x)dx",

    explanation:
      "Calculates area under a graph.",

    variables: [
      { symbol: "A", meaning: "area" },
      { symbol: "f(x)", meaning: "function" },
      { symbol: "a", meaning: "lower limit" },
      { symbol: "b", meaning: "upper limit" },
    ],

    example:
      "Find area under y=x² from 0 to 2",
  },

  {
    id: 249,
    title: "Matrix Determinant",
    subject: "Mathematics",
    category: "Matrices",
    level: "University",

    formula:
      "\\begin{vmatrix} a & b \\\\ c & d \\end{vmatrix} = ad - bc",

    explanation:
      "Formula for determinant of 2×2 matrix.",

    variables: [
      { symbol: "a,b,c,d", meaning: "matrix elements" },
    ],

    example:
      "Find determinant of [[2,3],[4,5]]",
  },

  {
    id: 250,
    title: "Arithmetic Progression",
    subject: "Mathematics",
    category: "Sequence",
    level: "WAEC",

    formula:
      "a_n = a + (n-1)d",

    explanation:
      "Finds nth term of arithmetic sequence.",

    variables: [
      { symbol: "a_n", meaning: "nth term" },
      { symbol: "a", meaning: "first term" },
      { symbol: "d", meaning: "common difference" },
      { symbol: "n", meaning: "term number" },
    ],

    example:
      "Find 10th term when a=2 and d=3",
  },

  {
    id: 251,
    title: "Geometric Progression",
    subject: "Mathematics",
    category: "Sequence",
    level: "WAEC",

    formula:
      "a_n = ar^{n-1}",

    explanation:
      "Finds nth term of geometric sequence.",

    variables: [
      { symbol: "a_n", meaning: "nth term" },
      { symbol: "a", meaning: "first term" },
      { symbol: "r", meaning: "common ratio" },
    ],

    example:
      "Find 5th term when a=3 and r=2",
  },

  {
    id: 252,
    title: "Sum of Arithmetic Series",
    subject: "Mathematics",
    category: "Sequence",
    level: "University",

    formula:
      "S_n = \\frac{n}{2}[2a+(n-1)d]",

    explanation:
      "Calculates sum of arithmetic series.",

    variables: [
      { symbol: "S_n", meaning: "sum of series" },
      { symbol: "n", meaning: "number of terms" },
      { symbol: "a", meaning: "first term" },
      { symbol: "d", meaning: "common difference" },
    ],

    example:
      "Find sum of first 20 terms",
  },

  {
    id: 253,
    title: "Sum of Geometric Series",
    subject: "Mathematics",
    category: "Sequence",
    level: "University",

    formula:
      "S_n = a\\frac{1-r^n}{1-r}",

    explanation:
      "Calculates sum of geometric progression.",

    variables: [
      { symbol: "S_n", meaning: "sum of series" },
      { symbol: "a", meaning: "first term" },
      { symbol: "r", meaning: "common ratio" },
    ],

    example:
      "Find sum when a=2, r=3, n=4",
  },

  {
    id: 254,
    title: "Standard Deviation",
    subject: "Mathematics",
    category: "Statistics",
    level: "University",

    formula:
      "\\sigma = \\sqrt{\\frac{\\sum (x-\\bar{x})^2}{n}}",

    explanation:
      "Measures spread of data values.",

    variables: [
      { symbol: "\\sigma", meaning: "standard deviation" },
      { symbol: "x", meaning: "data values" },
      { symbol: "\\bar{x}", meaning: "mean" },
      { symbol: "n", meaning: "number of values" },
    ],

    example:
      "Find standard deviation of a dataset",
  },

  {
    id: 255,
    title: "Variance Formula",
    subject: "Mathematics",
    category: "Statistics",
    level: "University",

    formula:
      "\\sigma^2 = \\frac{\\sum (x-\\bar{x})^2}{n}",

    explanation:
      "Measures variability in data.",

    variables: [
      { symbol: "\\sigma^2", meaning: "variance" },
      { symbol: "x", meaning: "data value" },
      { symbol: "\\bar{x}", meaning: "mean" },
    ],

    example:
      "Calculate variance of scores",
  },

  {
    id: 256,
    title: "Ideal Gas Law",
    subject: "Physics",
    category: "Thermodynamics",
    level: "University",

    formula:
      "PV = nRT",

    explanation:
      "Relates pressure, volume and temperature of gases.",

    variables: [
      { symbol: "P", meaning: "pressure" },
      { symbol: "V", meaning: "volume" },
      { symbol: "n", meaning: "number of moles" },
      { symbol: "R", meaning: "gas constant" },
      { symbol: "T", meaning: "temperature" },
    ],

    example:
      "Find pressure when volume and temperature are known",
  },

  {
    id: 257,
    title: "Boyle's Law",
    subject: "Physics",
    category: "Thermodynamics",
    level: "WAEC",

    formula:
      "P_1V_1 = P_2V_2",

    explanation:
      "Pressure inversely proportional to volume.",

    variables: [
      { symbol: "P_1", meaning: "initial pressure" },
      { symbol: "V_1", meaning: "initial volume" },
      { symbol: "P_2", meaning: "final pressure" },
      { symbol: "V_2", meaning: "final volume" },
    ],

    example:
      "Find new pressure after compression",
  },

  {
    id: 258,
    title: "Charles' Law",
    subject: "Physics",
    category: "Thermodynamics",
    level: "WAEC",

    formula:
      "\\frac{V_1}{T_1} = \\frac{V_2}{T_2}",

    explanation:
      "Volume directly proportional to temperature.",

    variables: [
      { symbol: "V_1", meaning: "initial volume" },
      { symbol: "T_1", meaning: "initial temperature" },
      { symbol: "V_2", meaning: "final volume" },
      { symbol: "T_2", meaning: "final temperature" },
    ],

    example:
      "Find new volume after heating gas",
  },

  {
    id: 259,
    title: "Specific Heat Capacity",
    subject: "Physics",
    category: "Heat",
    level: "University",

    formula:
      "Q = mc\\Delta T",

    explanation:
      "Heat energy required to raise temperature.",

    variables: [
      { symbol: "Q", meaning: "heat energy" },
      { symbol: "m", meaning: "mass" },
      { symbol: "c", meaning: "specific heat capacity" },
      { symbol: "\\Delta T", meaning: "temperature change" },
    ],

    example:
      "Find heat needed to raise water temperature",
  },

  {
    id: 260,
    title: "Frequency Formula",
    subject: "Physics",
    category: "Waves",
    level: "WAEC",

    formula:
      "f = \\frac{1}{T}",

    explanation:
      "Frequency equals reciprocal of time period.",

    variables: [
      { symbol: "f", meaning: "frequency" },
      { symbol: "T", meaning: "time period" },
    ],

    example:
      "Find frequency when T=0.02s",
  },
    {
    id: 261,
    title: "Time Period of Pendulum",
    subject: "Physics",
    category: "Oscillation",
    level: "University",

    formula:
      "T = 2\\pi\\sqrt{\\frac{l}{g}}",

    explanation:
      "Calculates time period of a simple pendulum.",

    variables: [
      { symbol: "T", meaning: "time period" },
      { symbol: "l", meaning: "length of pendulum" },
      { symbol: "g", meaning: "gravitational acceleration" },
    ],

    example:
      "Find period when l = 1m",
  },

  {
    id: 262,
    title: "Angular Velocity",
    subject: "Physics",
    category: "Circular Motion",
    level: "University",

    formula:
      "\\omega = \\frac{\\theta}{t}",

    explanation:
      "Angular displacement per unit time.",

    variables: [
      { symbol: "\\omega", meaning: "angular velocity" },
      { symbol: "\\theta", meaning: "angular displacement" },
      { symbol: "t", meaning: "time" },
    ],

    example:
      "Find angular velocity for θ=10rad in 2s",
  },

  {
    id: 263,
    title: "Centripetal Force",
    subject: "Physics",
    category: "Circular Motion",
    level: "University",

    formula:
      "F = \\frac{mv^2}{r}",

    explanation:
      "Force acting towards center of circular path.",

    variables: [
      { symbol: "m", meaning: "mass" },
      { symbol: "v", meaning: "velocity" },
      { symbol: "r", meaning: "radius" },
    ],

    example:
      "Find force when m=2kg, v=4m/s, r=3m",
  },

  {
    id: 264,
    title: "Magnetic Force",
    subject: "Physics",
    category: "Magnetism",
    level: "University",

    formula:
      "F = BIL\\sin\\theta",

    explanation:
      "Force on a current carrying conductor in magnetic field.",

    variables: [
      { symbol: "B", meaning: "magnetic flux density" },
      { symbol: "I", meaning: "current" },
      { symbol: "L", meaning: "length" },
      { symbol: "\\theta", meaning: "angle" },
    ],

    example:
      "Find force when B=2T, I=3A, L=4m",
  },

  {
    id: 265,
    title: "Transformer Equation",
    subject: "Physics",
    category: "Electricity",
    level: "University",

    formula:
      "\\frac{V_p}{V_s} = \\frac{N_p}{N_s}",

    explanation:
      "Relates voltages and turns in transformer.",

    variables: [
      { symbol: "V_p", meaning: "primary voltage" },
      { symbol: "V_s", meaning: "secondary voltage" },
      { symbol: "N_p", meaning: "primary turns" },
      { symbol: "N_s", meaning: "secondary turns" },
    ],

    example:
      "Find secondary voltage in transformer",
  },

  {
    id: 266,
    title: "Snell's Law",
    subject: "Physics",
    category: "Optics",
    level: "University",

    formula:
      "n_1\\sin\\theta_1 = n_2\\sin\\theta_2",

    explanation:
      "Describes refraction of light.",

    variables: [
      { symbol: "n_1", meaning: "first refractive index" },
      { symbol: "n_2", meaning: "second refractive index" },
      { symbol: "\\theta_1", meaning: "incident angle" },
      { symbol: "\\theta_2", meaning: "refracted angle" },
    ],

    example:
      "Find refracted angle in glass",
  },

  {
    id: 267,
    title: "Mirror Formula",
    subject: "Physics",
    category: "Optics",
    level: "University",

    formula:
      "\\frac{1}{f} = \\frac{1}{u} + \\frac{1}{v}",

    explanation:
      "Relates focal length, object distance and image distance.",

    variables: [
      { symbol: "f", meaning: "focal length" },
      { symbol: "u", meaning: "object distance" },
      { symbol: "v", meaning: "image distance" },
    ],

    example:
      "Find focal length of mirror",
  },

  {
    id: 268,
    title: "Efficiency Formula",
    subject: "Physics",
    category: "Machines",
    level: "WAEC",

    formula:
      "\\eta = \\frac{Useful\\ Output}{Input} \\times 100",

    explanation:
      "Measures machine efficiency.",

    variables: [
      { symbol: "\\eta", meaning: "efficiency" },
    ],

    example:
      "Find efficiency if output is 80J and input is 100J",
  },

  {
    id: 269,
    title: "Mechanical Advantage",
    subject: "Physics",
    category: "Machines",
    level: "WAEC",

    formula:
      "MA = \\frac{Load}{Effort}",

    explanation:
      "Measures force multiplication of machine.",

    variables: [
      { symbol: "Load", meaning: "output force" },
      { symbol: "Effort", meaning: "input force" },
    ],

    example:
      "Find MA when load=200N and effort=50N",
  },

  {
    id: 270,
    title: "Velocity Equation",
    subject: "Physics",
    category: "Motion",
    level: "Foundation",

    formula:
      "v = u + at",

    explanation:
      "First equation of motion.",

    variables: [
      { symbol: "v", meaning: "final velocity" },
      { symbol: "u", meaning: "initial velocity" },
      { symbol: "a", meaning: "acceleration" },
      { symbol: "t", meaning: "time" },
    ],

    example:
      "Find final velocity after acceleration",
  },

  {
    id: 271,
    title: "Displacement Equation",
    subject: "Physics",
    category: "Motion",
    level: "Foundation",

    formula:
      "s = ut + \\frac{1}{2}at^2",

    explanation:
      "Second equation of motion.",

    variables: [
      { symbol: "s", meaning: "displacement" },
      { symbol: "u", meaning: "initial velocity" },
      { symbol: "a", meaning: "acceleration" },
      { symbol: "t", meaning: "time" },
    ],

    example:
      "Find displacement after 5 seconds",
  },

  {
    id: 272,
    title: "Velocity-Displacement Equation",
    subject: "Physics",
    category: "Motion",
    level: "WAEC",

    formula:
      "v^2 = u^2 + 2as",

    explanation:
      "Third equation of motion.",

    variables: [
      { symbol: "v", meaning: "final velocity" },
      { symbol: "u", meaning: "initial velocity" },
      { symbol: "a", meaning: "acceleration" },
      { symbol: "s", meaning: "displacement" },
    ],

    example:
      "Find velocity after moving 20m",
  },

  {
    id: 273,
    title: "Equation of Straight Line",
    subject: "Mathematics",
    category: "Coordinate Geometry",
    level: "WAEC",

    formula:
      "y = mx + c",

    explanation:
      "General equation of a straight line.",

    variables: [
      { symbol: "m", meaning: "slope" },
      { symbol: "c", meaning: "y-intercept" },
    ],

    example:
      "Find equation with slope 2 and intercept 3",
  },

  {
    id: 274,
    title: "Midpoint Formula",
    subject: "Mathematics",
    category: "Coordinate Geometry",
    level: "WAEC",

    formula:
      "\\left(\\frac{x_1+x_2}{2},\\frac{y_1+y_2}{2}\\right)",

    explanation:
      "Finds midpoint between two points.",

    variables: [
      { symbol: "x_1,x_2", meaning: "x-coordinates" },
      { symbol: "y_1,y_2", meaning: "y-coordinates" },
    ],

    example:
      "Find midpoint of (2,4) and (6,8)",
  },

  {
    id: 275,
    title: "Heron's Formula",
    subject: "Mathematics",
    category: "Geometry",
    level: "University",

    formula:
      "A = \\sqrt{s(s-a)(s-b)(s-c)}",

    explanation:
      "Calculates area of triangle using sides.",

    variables: [
      { symbol: "A", meaning: "area" },
      { symbol: "s", meaning: "semi-perimeter" },
      { symbol: "a,b,c", meaning: "triangle sides" },
    ],

    example:
      "Find area when sides are 3,4,5",
  },
    {
    id: 276,
    title: "Molarity Formula",
    subject: "Chemistry",
    category: "Concentration",
    level: "University",

    formula:
      "M = \\frac{n}{V}",

    explanation:
      "Molarity equals number of moles divided by volume.",

    variables: [
      { symbol: "M", meaning: "molarity" },
      { symbol: "n", meaning: "number of moles" },
      { symbol: "V", meaning: "volume in dm³" },
    ],

    example:
      "Find molarity when n = 2mol and V = 0.5dm³",
  },

  {
    id: 277,
    title: "Density Formula",
    subject: "Chemistry",
    category: "Physical Chemistry",
    level: "WAEC",

    formula:
      "\\rho = \\frac{m}{V}",

    explanation:
      "Density equals mass divided by volume.",

    variables: [
      { symbol: "\\rho", meaning: "density" },
      { symbol: "m", meaning: "mass" },
      { symbol: "V", meaning: "volume" },
    ],

    example:
      "Find density when mass = 10g and volume = 2cm³",
  },

  {
    id: 278,
    title: "Percentage Yield",
    subject: "Chemistry",
    category: "Stoichiometry",
    level: "University",

    formula:
      "\\%\\ Yield = \\frac{Actual\\ Yield}{Theoretical\\ Yield} \\times 100",

    explanation:
      "Measures efficiency of chemical reaction.",

    variables: [
      { symbol: "Actual Yield", meaning: "experimental yield" },
      { symbol: "Theoretical Yield", meaning: "expected yield" },
    ],

    example:
      "Find percentage yield if actual = 8g and theoretical = 10g",
  },

  {
    id: 279,
    title: "Ideal Gas Equation",
    subject: "Chemistry",
    category: "Gas Laws",
    level: "University",

    formula:
      "PV = nRT",

    explanation:
      "Relates pressure, volume, temperature and moles.",

    variables: [
      { symbol: "P", meaning: "pressure" },
      { symbol: "V", meaning: "volume" },
      { symbol: "n", meaning: "number of moles" },
      { symbol: "R", meaning: "gas constant" },
      { symbol: "T", meaning: "temperature" },
    ],

    example:
      "Find pressure of gas in a container",
  },

  {
    id: 280,
    title: "pH Formula",
    subject: "Chemistry",
    category: "Acids and Bases",
    level: "University",

    formula:
      "pH = -\\log[H^+]",

    explanation:
      "Measures acidity of a solution.",

    variables: [
      { symbol: "[H^+]", meaning: "hydrogen ion concentration" },
    ],

    example:
      "Find pH when [H⁺] = 1 × 10⁻³",
  },

  {
    id: 281,
    title: "Avogadro's Formula",
    subject: "Chemistry",
    category: "Atomic Structure",
    level: "WAEC",

    formula:
      "N = nN_A",

    explanation:
      "Calculates number of particles in substance.",

    variables: [
      { symbol: "N", meaning: "number of particles" },
      { symbol: "n", meaning: "number of moles" },
      { symbol: "N_A", meaning: "Avogadro's constant" },
    ],

    example:
      "Find particles in 2 moles of oxygen",
  },

  {
    id: 282,
    title: "Empirical Formula",
    subject: "Chemistry",
    category: "Stoichiometry",
    level: "University",

    formula:
      "\\text{Empirical Formula} = \\frac{Mole\\ Ratio}{Smallest\\ Ratio}",

    explanation:
      "Used to determine simplest ratio of atoms.",

    variables: [
      { symbol: "Mole Ratio", meaning: "ratio of moles" },
    ],

    example:
      "Find empirical formula from percentage composition",
  },

  {
    id: 283,
    title: "Faraday's Law",
    subject: "Chemistry",
    category: "Electrochemistry",
    level: "University",

    formula:
      "m = \\frac{Q}{F} \\times \\frac{M}{z}",

    explanation:
      "Mass deposited during electrolysis.",

    variables: [
      { symbol: "m", meaning: "mass deposited" },
      { symbol: "Q", meaning: "charge" },
      { symbol: "F", meaning: "Faraday constant" },
      { symbol: "M", meaning: "molar mass" },
      { symbol: "z", meaning: "valency" },
    ],

    example:
      "Find copper deposited during electrolysis",
  },

  {
    id: 284,
    title: "Rate of Reaction",
    subject: "Chemistry",
    category: "Chemical Kinetics",
    level: "University",

    formula:
      "Rate = \\frac{\\Delta Quantity}{\\Delta Time}",

    explanation:
      "Measures speed of chemical reaction.",

    variables: [
      { symbol: "\\Delta Quantity", meaning: "change in amount" },
      { symbol: "\\Delta Time", meaning: "time interval" },
    ],

    example:
      "Find reaction rate from experiment data",
  },

  {
    id: 285,
    title: "Nernst Equation",
    subject: "Chemistry",
    category: "Electrochemistry",
    level: "University",

    formula:
      "E = E^\\circ - \\frac{0.0591}{n}\\log Q",

    explanation:
      "Calculates cell potential under non-standard conditions.",

    variables: [
      { symbol: "E", meaning: "cell potential" },
      { symbol: "E^\\circ", meaning: "standard potential" },
      { symbol: "n", meaning: "electrons transferred" },
      { symbol: "Q", meaning: "reaction quotient" },
    ],

    example:
      "Find electrode potential in a cell",
  },

  {
    id: 286,
    title: "Maclaurin Series",
    subject: "Further Mathematics",
    category: "Series",
    level: "University",

    formula:
      "f(x)=f(0)+xf'(0)+\\frac{x^2}{2!}f''(0)+...",

    explanation:
      "Expansion of function about x = 0.",

    variables: [
      { symbol: "f(x)", meaning: "function" },
      { symbol: "x", meaning: "variable" },
    ],

    example:
      "Expand e^x using Maclaurin series",
  },

  {
    id: 287,
    title: "Binomial Theorem",
    subject: "Further Mathematics",
    category: "Algebra",
    level: "University",

    formula:
      "(a+b)^n = \\sum_{k=0}^{n} \\binom{n}{k} a^{n-k}b^k",

    explanation:
      "Expands powers of binomials.",

    variables: [
      { symbol: "n", meaning: "power" },
      { symbol: "a,b", meaning: "terms" },
    ],

    example:
      "Expand (x+1)^5",
  },

  {
    id: 288,
    title: "Differential Equation",
    subject: "Further Mathematics",
    category: "Calculus",
    level: "University",

    formula:
      "\\frac{dy}{dx} = ky",

    explanation:
      "Basic first-order differential equation.",

    variables: [
      { symbol: "y", meaning: "dependent variable" },
      { symbol: "x", meaning: "independent variable" },
      { symbol: "k", meaning: "constant" },
    ],

    example:
      "Solve dy/dx = 3y",
  },

  {
    id: 289,
    title: "Hyperbolic Identity",
    subject: "Further Mathematics",
    category: "Hyperbolic Functions",
    level: "University",

    formula:
      "\\cosh^2 x - \\sinh^2 x = 1",

    explanation:
      "Fundamental hyperbolic identity.",

    variables: [
      { symbol: "x", meaning: "variable" },
    ],

    example:
      "Verify identity for x = 2",
  },

  {
    id: 290,
    title: "Vector Magnitude",
    subject: "Further Mathematics",
    category: "Vectors",
    level: "University",

    formula:
      "|\\vec{a}| = \\sqrt{x^2 + y^2 + z^2}",

    explanation:
      "Calculates magnitude of vector.",

    variables: [
      { symbol: "x,y,z", meaning: "vector components" },
    ],

    example:
      "Find magnitude of vector (2,3,6)",
  },

  {
    id: 291,
    title: "Dot Product",
    subject: "Further Mathematics",
    category: "Vectors",
    level: "University",

    formula:
      "\\vec{a} \\cdot \\vec{b} = |a||b|\\cos\\theta",

    explanation:
      "Calculates scalar product of vectors.",

    variables: [
      { symbol: "\\vec{a}", meaning: "first vector" },
      { symbol: "\\vec{b}", meaning: "second vector" },
      { symbol: "\\theta", meaning: "angle between vectors" },
    ],

    example:
      "Find dot product of two vectors",
  },

  {
    id: 292,
    title: "Cross Product",
    subject: "Further Mathematics",
    category: "Vectors",
    level: "University",

    formula:
      "|\\vec{a} \\times \\vec{b}| = |a||b|\\sin\\theta",

    explanation:
      "Calculates vector product magnitude.",

    variables: [
      { symbol: "\\vec{a}", meaning: "first vector" },
      { symbol: "\\vec{b}", meaning: "second vector" },
      { symbol: "\\theta", meaning: "angle between vectors" },
    ],

    example:
      "Find cross product magnitude",
  },

  {
    id: 293,
    title: "Complex Number Modulus",
    subject: "Further Mathematics",
    category: "Complex Numbers",
    level: "University",

    formula:
      "|z| = \\sqrt{a^2+b^2}",

    explanation:
      "Finds modulus of complex number.",

    variables: [
      { symbol: "a", meaning: "real part" },
      { symbol: "b", meaning: "imaginary part" },
    ],

    example:
      "Find modulus of 3 + 4i",
  },

  {
    id: 294,
    title: "De Moivre's Theorem",
    subject: "Further Mathematics",
    category: "Complex Numbers",
    level: "University",

    formula:
      "(\\cos\\theta+i\\sin\\theta)^n = \\cos n\\theta+i\\sin n\\theta",

    explanation:
      "Used in powers of complex numbers.",

    variables: [
      { symbol: "\\theta", meaning: "angle" },
      { symbol: "n", meaning: "power" },
    ],

    example:
      "Expand complex number using theorem",
  },

  {
    id: 295,
    title: "Laplace Transform",
    subject: "Further Mathematics",
    category: "Transforms",
    level: "University",

    formula:
      "\\mathcal{L}\\{f(t)\\}=\\int_0^\\infty e^{-st}f(t)dt",

    explanation:
      "Transforms time-domain function to frequency domain.",

    variables: [
      { symbol: "f(t)", meaning: "time function" },
      { symbol: "s", meaning: "complex frequency" },
    ],

    example:
      "Find Laplace transform of t²",
  },

  {
    id: 296,
    title: "Inverse Laplace Transform",
    subject: "Further Mathematics",
    category: "Transforms",
    level: "University",

    formula:
      "\\mathcal{L}^{-1}\\{F(s)\\}=f(t)",

    explanation:
      "Converts frequency-domain function to time-domain.",

    variables: [
      { symbol: "F(s)", meaning: "frequency-domain function" },
    ],

    example:
      "Find inverse Laplace of 1/s²",
  },

  {
    id: 297,
    title: "Polar Form of Complex Number",
    subject: "Further Mathematics",
    category: "Complex Numbers",
    level: "University",

    formula:
      "z = r(\\cos\\theta + i\\sin\\theta)",

    explanation:
      "Expresses complex number in polar form.",

    variables: [
      { symbol: "r", meaning: "modulus" },
      { symbol: "\\theta", meaning: "argument" },
    ],

    example:
      "Convert 1+i into polar form",
  },

  {
    id: 298,
    title: "Parametric Equation",
    subject: "Further Mathematics",
    category: "Coordinate Geometry",
    level: "University",

    formula:
      "x = a\\cos t, \\quad y = a\\sin t",

    explanation:
      "Represents circle parametrically.",

    variables: [
      { symbol: "a", meaning: "radius" },
      { symbol: "t", meaning: "parameter" },
    ],

    example:
      "Sketch curve for parametric equation",
  },

  {
    id: 299,
    title: "Second Derivative Test",
    subject: "Further Mathematics",
    category: "Calculus",
    level: "University",

    formula:
      "\\frac{d^2y}{dx^2}",

    explanation:
      "Determines nature of stationary points.",

    variables: [
      { symbol: "y", meaning: "function" },
      { symbol: "x", meaning: "variable" },
    ],

    example:
      "Determine maxima or minima",
  },

  {
    id: 300,
    title: "Fourier Series",
    subject: "Further Mathematics",
    category: "Series",
    level: "University",

    formula:
      "f(x)=a_0+\\sum_{n=1}^{\\infty}(a_n\\cos nx+b_n\\sin nx)",

    explanation:
      "Represents periodic functions as trigonometric series.",

    variables: [
      { symbol: "a_n", meaning: "cosine coefficients" },
      { symbol: "b_n", meaning: "sine coefficients" },
      { symbol: "n", meaning: "term number" },
    ],

    example:
      "Expand periodic signal using Fourier series",
  },

  // =========================
  // ADDITIONAL FORMULAS
  // =========================

  {
    id: 301,
    title: "Area of a Sector",
    subject: "Mathematics",
    category: "Geometry",
    level: "Foundation",

    formula:
      "A = \\frac{1}{2}r^2\\theta",

    explanation:
      "Calculates the area of a sector of a circle.",

    variables: [
      { symbol: "r", meaning: "radius" },
      { symbol: "\\theta", meaning: "angle in radians" },
    ],

    example:
      "Find area of sector with r=5 and θ=π/3",
  },

  {
    id: 302,
    title: "Arc Length",
    subject: "Mathematics",
    category: "Geometry",
    level: "Foundation",

    formula:
      "s = r\\theta",

    explanation:
      "Calculates the length of an arc of a circle.",

    variables: [
      { symbol: "s", meaning: "arc length" },
      { symbol: "r", meaning: "radius" },
      { symbol: "\\theta", meaning: "angle in radians" },
    ],

    example:
      "Find arc length with r=10 and θ=π/2",
  },

  {
    id: 303,
    title: "Volume of a Sphere",
    subject: "Mathematics",
    category: "Mensuration",
    level: "Foundation",

    formula:
      "V = \\frac{4}{3}\\pi r^3",

    explanation:
      "Calculates the volume of a sphere.",

    variables: [
      { symbol: "V", meaning: "volume" },
      { symbol: "r", meaning: "radius" },
    ],

    example:
      "Find volume of sphere with r=3cm",
  },

  {
    id: 304,
    title: "Surface Area of a Sphere",
    subject: "Mathematics",
    category: "Mensuration",
    level: "Foundation",

    formula:
      "A = 4\\pi r^2",

    explanation:
      "Calculates the surface area of a sphere.",

    variables: [
      { symbol: "A", meaning: "surface area" },
      { symbol: "r", meaning: "radius" },
    ],

    example:
      "Find surface area of sphere with r=7cm",
  },

  {
    id: 305,
    title: "Volume of a Cone",
    subject: "Mathematics",
    category: "Mensuration",
    level: "Foundation",

    formula:
      "V = \\frac{1}{3}\\pi r^2 h",

    explanation:
      "Calculates the volume of a cone.",

    variables: [
      { symbol: "V", meaning: "volume" },
      { symbol: "r", meaning: "radius" },
      { symbol: "h", meaning: "height" },
    ],

    example:
      "Find volume of cone with r=3 and h=9",
  },

  {
    id: 306,
    title: "Volume of a Pyramid",
    subject: "Mathematics",
    category: "Mensuration",
    level: "Foundation",

    formula:
      "V = \\frac{1}{3}Ah",

    explanation:
      "Calculates the volume of a pyramid.",

    variables: [
      { symbol: "V", meaning: "volume" },
      { symbol: "A", meaning: "base area" },
      { symbol: "h", meaning: "height" },
    ],

    example:
      "Find volume of pyramid with base area 12 and height 9",
  },

  {
    id: 307,
    title: "Area of a Trapezium",
    subject: "Mathematics",
    category: "Geometry",
    level: "Foundation",

    formula:
      "A = \\frac{1}{2}(a+b)h",

    explanation:
      "Calculates the area of a trapezium.",

    variables: [
      { symbol: "a", meaning: "first parallel side" },
      { symbol: "b", meaning: "second parallel side" },
      { symbol: "h", meaning: "height" },
    ],

    example:
      "Find area of trapezium with a=5, b=7, h=4",
  },

  {
    id: 308,
    title: "Heron's Formula",
    subject: "Mathematics",
    category: "Geometry",
    level: "University",

    formula:
      "A = \\sqrt{s(s-a)(s-b)(s-c)}",

    explanation:
      "Calculates the area of a triangle using side lengths.",

    variables: [
      { symbol: "s", meaning: "semi-perimeter" },
      { symbol: "a", meaning: "side a" },
      { symbol: "b", meaning: "side b" },
      { symbol: "c", meaning: "side c" },
    ],

    example:
      "Find area of triangle with sides 3, 4, 5",
  },

  {
    id: 309,
    title: "Sine Rule",
    subject: "Mathematics",
    category: "Trigonometry",
    level: "Foundation",

    formula:
      "\\frac{a}{\\sin A} = \\frac{b}{\\sin B} = \\frac{c}{\\sin C}",

    explanation:
      "Relates sides and angles in any triangle.",

    variables: [
      { symbol: "a", meaning: "side opposite angle A" },
      { symbol: "b", meaning: "side opposite angle B" },
      { symbol: "c", meaning: "side opposite angle C" },
    ],

    example:
      "Find side a when b=10, A=30°, B=60°",
  },

  {
    id: 310,
    title: "Cosine Rule",
    subject: "Mathematics",
    category: "Trigonometry",
    level: "Foundation",

    formula:
      "c^2 = a^2 + b^2 - 2ab\\cos C",

    explanation:
      "Relates sides and angles in any triangle.",

    variables: [
      { symbol: "a", meaning: "side a" },
      { symbol: "b", meaning: "side b" },
      { symbol: "c", meaning: "side c" },
      { symbol: "C", meaning: "angle opposite side c" },
    ],

    example:
      "Find side c when a=5, b=7, C=60°",
  },

  {
    id: 311,
    title: "Equation of a Circle",
    subject: "Mathematics",
    category: "Coordinate Geometry",
    level: "Foundation",

    formula:
      "(x-h)^2 + (y-k)^2 = r^2",

    explanation:
      "Represents a circle with center (h,k) and radius r.",

    variables: [
      { symbol: "h", meaning: "x-coordinate of center" },
      { symbol: "k", meaning: "y-coordinate of center" },
      { symbol: "r", meaning: "radius" },
    ],

    example:
      "Find equation of circle with center (2,3) and radius 4",
  },

  {
    id: 312,
    title: "Midpoint Formula",
    subject: "Mathematics",
    category: "Coordinate Geometry",
    level: "Foundation",

    formula:
      "M = \\left(\\frac{x_1+x_2}{2}, \\frac{y_1+y_2}{2}\\right)",

    explanation:
      "Finds the midpoint between two points.",

    variables: [
      { symbol: "x_1", meaning: "first x-coordinate" },
      { symbol: "x_2", meaning: "second x-coordinate" },
      { symbol: "y_1", meaning: "first y-coordinate" },
      { symbol: "y_2", meaning: "second y-coordinate" },
    ],

    example:
      "Find midpoint of (2,4) and (6,8)",
  },

  {
    id: 313,
    title: "Arithmetic Mean",
    subject: "Mathematics",
    category: "Statistics",
    level: "Foundation",

    formula:
      "\\bar{x} = \\frac{\\sum x}{n}",

    explanation:
      "Calculates the average of a set of numbers.",

    variables: [
      { symbol: "\\bar{x}", meaning: "mean" },
      { symbol: "\\sum x", meaning: "sum of values" },
      { symbol: "n", meaning: "number of values" },
    ],

    example:
      "Find mean of 2, 4, 6, 8, 10",
  },

  {
    id: 314,
    title: "Standard Deviation",
    subject: "Mathematics",
    category: "Statistics",
    level: "University",

    formula:
      "\\sigma = \\sqrt{\\frac{\\sum (x-\\bar{x})^2}{n}}",

    explanation:
      "Measures the spread of data from the mean.",

    variables: [
      { symbol: "\\sigma", meaning: "standard deviation" },
      { symbol: "x", meaning: "data value" },
      { symbol: "\\bar{x}", meaning: "mean" },
      { symbol: "n", meaning: "number of values" },
    ],

    example:
      "Find standard deviation of 2, 4, 6, 8",
  },

  {
    id: 315,
    title: "Variance",
    subject: "Mathematics",
    category: "Statistics",
    level: "University",

    formula:
      "\\sigma^2 = \\frac{\\sum (x-\\bar{x})^2}{n}",

    explanation:
      "Measures the spread of data from the mean squared.",

    variables: [
      { symbol: "\\sigma^2", meaning: "variance" },
      { symbol: "x", meaning: "data value" },
      { symbol: "\\bar{x}", meaning: "mean" },
      { symbol: "n", meaning: "number of values" },
    ],

    example:
      "Find variance of 2, 4, 6, 8",
  },

  {
    id: 316,
    title: "Permutation Formula",
    subject: "Mathematics",
    category: "Combinatorics",
    level: "Foundation",

    formula:
      "nP_r = \\frac{n!}{(n-r)!}",

    explanation:
      "Calculates the number of ways to arrange r items from n items.",

    variables: [
      { symbol: "n", meaning: "total items" },
      { symbol: "r", meaning: "items selected" },
    ],

    example:
      "Find 5P_3",
  },

  {
    id: 317,
    title: "Combination Formula",
    subject: "Mathematics",
    category: "Combinatorics",
    level: "Foundation",

    formula:
      "nC_r = \\frac{n!}{r!(n-r)!}",

    explanation:
      "Calculates the number of ways to select r items from n items.",

    variables: [
      { symbol: "n", meaning: "total items" },
      { symbol: "r", meaning: "items selected" },
    ],

    example:
      "Find 5C_3",
  },

  {
    id: 318,
    title: "Laws of Indices",
    subject: "Mathematics",
    category: "Algebra",
    level: "Foundation",

    formula:
      "a^m \\times a^n = a^{m+n}",

    explanation:
      "Multiplication rule for exponents with the same base.",

    variables: [
      { symbol: "a", meaning: "base" },
      { symbol: "m", meaning: "first exponent" },
      { symbol: "n", meaning: "second exponent" },
    ],

    example:
      "Simplify 2^3 × 2^4",
  },

  {
    id: 319,
    title: "Logarithm Product Rule",
    subject: "Mathematics",
    category: "Logarithms",
    level: "Foundation",

    formula:
      "\\log(ab) = \\log a + \\log b",

    explanation:
      "The log of a product equals the sum of the logs.",

    variables: [
      { symbol: "a", meaning: "first number" },
      { symbol: "b", meaning: "second number" },
    ],

    example:
      "Simplify log(2) + log(3)",
  },

  {
    id: 320,
    title: "Logarithm Quotient Rule",
    subject: "Mathematics",
    category: "Logarithms",
    level: "Foundation",

    formula:
      "\\log\\left(\\frac{a}{b}\\right) = \\log a - \\log b",

    explanation:
      "The log of a quotient equals the difference of the logs.",

    variables: [
      { symbol: "a", meaning: "numerator" },
      { symbol: "b", meaning: "denominator" },
    ],

    example:
      "Simplify log(8) - log(2)",
  },

  {
    id: 321,
    title: "Logarithm Power Rule",
    subject: "Mathematics",
    category: "Logarithms",
    level: "Foundation",

    formula:
      "\\log(a^n) = n\\log a",

    explanation:
      "The log of a power equals the exponent times the log.",

    variables: [
      { symbol: "a", meaning: "base" },
      { symbol: "n", meaning: "exponent" },
    ],

    example:
      "Simplify log(2^5)",
  },

  {
    id: 322,
    title: "Arithmetic Progression nth Term",
    subject: "Mathematics",
    category: "Sequences",
    level: "Foundation",

    formula:
      "a_n = a + (n-1)d",

    explanation:
      "Finds the nth term of an arithmetic progression.",

    variables: [
      { symbol: "a", meaning: "first term" },
      { symbol: "d", meaning: "common difference" },
      { symbol: "n", meaning: "term number" },
    ],

    example:
      "Find 10th term of AP with a=2, d=3",
  },

  {
    id: 323,
    title: "Geometric Progression nth Term",
    subject: "Mathematics",
    category: "Sequences",
    level: "Foundation",

    formula:
      "a_n = ar^{n-1}",

    explanation:
      "Finds the nth term of a geometric progression.",

    variables: [
      { symbol: "a", meaning: "first term" },
      { symbol: "r", meaning: "common ratio" },
      { symbol: "n", meaning: "term number" },
    ],

    example:
      "Find 5th term of GP with a=2, r=3",
  },

  {
    id: 324,
    title: "Sum of Arithmetic Progression",
    subject: "Mathematics",
    category: "Sequences",
    level: "Foundation",

    formula:
      "S_n = \\frac{n}{2}[2a+(n-1)d]",

    explanation:
      "Finds the sum of the first n terms of an AP.",

    variables: [
      { symbol: "S_n", meaning: "sum of n terms" },
      { symbol: "a", meaning: "first term" },
      { symbol: "d", meaning: "common difference" },
      { symbol: "n", meaning: "number of terms" },
    ],

    example:
      "Find sum of first 10 terms of AP with a=2, d=3",
  },

  {
    id: 325,
    title: "Sum of Geometric Progression",
    subject: "Mathematics",
    category: "Sequences",
    level: "Foundation",

    formula:
      "S_n = a\\frac{1-r^n}{1-r}",

    explanation:
      "Finds the sum of the first n terms of a GP.",

    variables: [
      { symbol: "S_n", meaning: "sum of n terms" },
      { symbol: "a", meaning: "first term" },
      { symbol: "r", meaning: "common ratio" },
      { symbol: "n", meaning: "number of terms" },
    ],

    example:
      "Find sum of first 5 terms of GP with a=2, r=3",
  },

  {
    id: 326,
    title: "Sum of Infinite GP",
    subject: "Mathematics",
    category: "Sequences",
    level: "University",

    formula:
      "S_\\infty = \\frac{a}{1-r}",

    explanation:
      "Finds the sum of an infinite geometric series when |r|<1.",

    variables: [
      { symbol: "S_\\infty", meaning: "infinite sum" },
      { symbol: "a", meaning: "first term" },
      { symbol: "r", meaning: "common ratio" },
    ],

    example:
      "Find sum of 1 + 1/2 + 1/4 + ...",
  },

  {
    id: 327,
    title: "Power Rule for Derivatives",
    subject: "Mathematics",
    category: "Calculus",
    level: "University",

    formula:
      "\\frac{d}{dx}(x^n) = nx^{n-1}",

    explanation:
      "Finds the derivative of a power function.",

    variables: [
      { symbol: "x", meaning: "variable" },
      { symbol: "n", meaning: "exponent" },
    ],

    example:
      "Find derivative of x^3",
  },

  {
    id: 328,
    title: "Power Rule for Integration",
    subject: "Mathematics",
    category: "Calculus",
    level: "University",

    formula:
      "\\int x^n dx = \\frac{x^{n+1}}{n+1} + C",

    explanation:
      "Finds the integral of a power function.",

    variables: [
      { symbol: "x", meaning: "variable" },
      { symbol: "n", meaning: "exponent" },
      { symbol: "C", meaning: "constant of integration" },
    ],

    example:
      "Find integral of x^2",
  },

  {
    id: 329,
    title: "Definite Integral",
    subject: "Mathematics",
    category: "Calculus",
    level: "University",

    formula:
      "A = \\int_a^b f(x)dx",

    explanation:
      "Calculates the area under a curve between two points.",

    variables: [
      { symbol: "a", meaning: "lower limit" },
      { symbol: "b", meaning: "upper limit" },
      { symbol: "f(x)", meaning: "function" },
    ],

    example:
      "Find area under f(x)=x from 0 to 2",
  },

  {
    id: 330,
    title: "Determinant of 2x2 Matrix",
    subject: "Mathematics",
    category: "Matrices",
    level: "Foundation",

    formula:
      "\\begin{vmatrix} a & b \\\\ c & d \\end{vmatrix} = ad - bc",

    explanation:
      "Calculates the determinant of a 2x2 matrix.",

    variables: [
      { symbol: "a", meaning: "top-left element" },
      { symbol: "b", meaning: "top-right element" },
      { symbol: "c", meaning: "bottom-left element" },
      { symbol: "d", meaning: "bottom-right element" },
    ],

    example:
      "Find determinant of [[2,3],[4,5]]",
  },

  {
    id: 331,
    title: "Boyle's Law",
    subject: "Chemistry",
    category: "Gas Laws",
    level: "Foundation",

    formula:
      "P_1V_1 = P_2V_2",

    explanation:
      "At constant temperature, pressure and volume are inversely proportional.",

    variables: [
      { symbol: "P_1", meaning: "initial pressure" },
      { symbol: "V_1", meaning: "initial volume" },
      { symbol: "P_2", meaning: "final pressure" },
      { symbol: "V_2", meaning: "final volume" },
    ],

    example:
      "Find final pressure when volume changes",
  },

  {
    id: 332,
    title: "Charles's Law",
    subject: "Chemistry",
    category: "Gas Laws",
    level: "Foundation",

    formula:
      "\\frac{V_1}{T_1} = \\frac{V_2}{T_2}",

    explanation:
      "At constant pressure, volume and temperature are directly proportional.",

    variables: [
      { symbol: "V_1", meaning: "initial volume" },
      { symbol: "T_1", meaning: "initial temperature" },
      { symbol: "V_2", meaning: "final volume" },
      { symbol: "T_2", meaning: "final temperature" },
    ],

    example:
      "Find final volume when temperature changes",
  },

  {
    id: 333,
    title: "Molarity",
    subject: "Chemistry",
    category: "Solutions",
    level: "Foundation",

    formula:
      "M = \\frac{n}{V}",

    explanation:
      "Calculates the concentration of a solution in moles per liter.",

    variables: [
      { symbol: "M", meaning: "molarity" },
      { symbol: "n", meaning: "number of moles" },
      { symbol: "V", meaning: "volume in liters" },
    ],

    example:
      "Find molarity of 2 moles in 1 liter",
  },

  {
    id: 334,
    title: "Avogadro's Number",
    subject: "Chemistry",
    category: "Stoichiometry",
    level: "Foundation",

    formula:
      "N = nN_A",

    explanation:
      "Calculates the number of particles from moles.",

    variables: [
      { symbol: "N", meaning: "number of particles" },
      { symbol: "n", meaning: "number of moles" },
      { symbol: "N_A", meaning: "Avogadro's number (6.022×10²³)" },
    ],

    example:
      "Find number of particles in 2 moles",
  },

  {
    id: 335,
    title: "Empirical Formula",
    subject: "Chemistry",
    category: "Stoichiometry",
    level: "Foundation",

    formula:
      "\\text{Empirical Formula} = \\frac{\\text{Mole Ratio}}{\\text{Smallest Ratio}}",

    explanation:
      "Finds the simplest whole number ratio of elements in a compound.",

    variables: [
      { symbol: "Mole Ratio", meaning: "moles of each element" },
      { symbol: "Smallest Ratio", meaning: "smallest mole value" },
    ],

    example:
      "Find empirical formula from percentage composition",
  },

  {
    id: 336,
    title: "Faraday's Law of Electrolysis",
    subject: "Chemistry",
    category: "Electrochemistry",
    level: "University",

    formula:
      "m = \\frac{Q}{F} \\times \\frac{M}{z}",

    explanation:
      "Calculates the mass of substance deposited during electrolysis.",

    variables: [
      { symbol: "m", meaning: "mass deposited" },
      { symbol: "Q", meaning: "charge" },
      { symbol: "F", meaning: "Faraday's constant" },
      { symbol: "M", meaning: "molar mass" },
      { symbol: "z", meaning: "valency" },
    ],

    example:
      "Find mass of copper deposited",
  },

  {
    id: 337,
    title: "Rate of Reaction",
    subject: "Chemistry",
    category: "Kinetics",
    level: "University",

    formula:
      "Rate = \\frac{\\Delta Quantity}{\\Delta Time}",

    explanation:
      "Calculates the rate of a chemical reaction.",

    variables: [
      { symbol: "\\Delta Quantity", meaning: "change in quantity" },
      { symbol: "\\Delta Time", meaning: "change in time" },
    ],

    example:
      "Find rate of reaction",
  },

  {
    id: 338,
    title: "Nernst Equation",
    subject: "Chemistry",
    category: "Electrochemistry",
    level: "University",

    formula:
      "E = E^\\circ - \\frac{0.0591}{n}\\log Q",

    explanation:
      "Calculates cell potential under non-standard conditions.",

    variables: [
      { symbol: "E", meaning: "cell potential" },
      { symbol: "E^\\circ", meaning: "standard cell potential" },
      { symbol: "n", meaning: "number of electrons" },
      { symbol: "Q", meaning: "reaction quotient" },
    ],

    example:
      "Find cell potential at non-standard conditions",
  },

  {
    id: 339,
    title: "Taylor Series",
    subject: "Mathematics",
    category: "Calculus",
    level: "University",

    formula:
      "f(x)=f(a)+f'(a)(x-a)+\\frac{f''(a)}{2!}(x-a)^2+...",

    explanation:
      "Represents a function as an infinite sum of terms.",

    variables: [
      { symbol: "f(x)", meaning: "function" },
      { symbol: "a", meaning: "expansion point" },
      { symbol: "f'(a)", meaning: "first derivative at a" },
    ],

    example:
      "Expand f(x)=e^x around a=0",
  },

  {
    id: 340,
    title: "Maclaurin Series",
    subject: "Mathematics",
    category: "Calculus",
    level: "University",

    formula:
      "f(x)=f(0)+xf'(0)+\\frac{x^2}{2!}f''(0)+...",

    explanation:
      "Taylor series expansion around x=0.",

    variables: [
      { symbol: "f(x)", meaning: "function" },
      { symbol: "f'(0)", meaning: "first derivative at 0" },
      { symbol: "f''(0)", meaning: "second derivative at 0" },
    ],

    example:
      "Expand f(x)=sin(x) using Maclaurin series",
  },

  {
    id: 341,
    title: "Binomial Theorem",
    subject: "Mathematics",
    category: "Algebra",
    level: "Foundation",

    formula:
      "(a+b)^n = \\sum_{k=0}^{n} \\binom{n}{k} a^{n-k}b^k",

    explanation:
      "Expands powers of binomial expressions.",

    variables: [
      { symbol: "a", meaning: "first term" },
      { symbol: "b", meaning: "second term" },
      { symbol: "n", meaning: "power" },
    ],

    example:
      "Expand (x+y)^3",
  },

  {
    id: 342,
    title: "Exponential Growth",
    subject: "Mathematics",
    category: "Exponential Functions",
    level: "University",

    formula:
      "\\frac{dy}{dx} = ky",

    explanation:
      "Models exponential growth or decay.",

    variables: [
      { symbol: "y", meaning: "quantity" },
      { symbol: "k", meaning: "growth constant" },
    ],

    example:
      "Model population growth",
  },

  {
    id: 343,
    title: "Hyperbolic Identity",
    subject: "Mathematics",
    category: "Hyperbolic Functions",
    level: "University",

    formula:
      "\\cosh^2 x - \\sinh^2 x = 1",

    explanation:
      "Fundamental identity for hyperbolic functions.",

    variables: [
      { symbol: "x", meaning: "variable" },
    ],

    example:
      "Verify identity for x=1",
  },

  {
    id: 344,
    title: "Vector Magnitude",
    subject: "Mathematics",
    category: "Vectors",
    level: "University",

    formula:
      "|\\vec{a}| = \\sqrt{x^2 + y^2 + z^2}",

    explanation:
      "Calculates the magnitude of a vector.",

    variables: [
      { symbol: "x", meaning: "x-component" },
      { symbol: "y", meaning: "y-component" },
      { symbol: "z", meaning: "z-component" },
    ],

    example:
      "Find magnitude of vector (3,4,0)",
  },

  {
    id: 345,
    title: "Dot Product",
    subject: "Mathematics",
    category: "Vectors",
    level: "University",

    formula:
      "\\vec{a} \\cdot \\vec{b} = |a||b|\\cos\\theta",

    explanation:
      "Calculates the dot product of two vectors.",

    variables: [
      { symbol: "a", meaning: "first vector" },
      { symbol: "b", meaning: "second vector" },
      { symbol: "\\theta", meaning: "angle between vectors" },
    ],

    example:
      "Find dot product of (1,2) and (3,4)",
  },

  {
    id: 346,
    title: "Cross Product Magnitude",
    subject: "Mathematics",
    category: "Vectors",
    level: "University",

    formula:
      "|\\vec{a} \\times \\vec{b}| = |a||b|\\sin\\theta",

    explanation:
      "Calculates the magnitude of the cross product of two vectors.",

    variables: [
      { symbol: "a", meaning: "first vector" },
      { symbol: "b", meaning: "second vector" },
      { symbol: "\\theta", meaning: "angle between vectors" },
    ],

    example:
      "Find cross product magnitude of (1,0,0) and (0,1,0)",
  },

  {
    id: 347,
    title: "Complex Number Modulus",
    subject: "Mathematics",
    category: "Complex Numbers",
    level: "University",

    formula:
      "|z| = \\sqrt{a^2+b^2}",

    explanation:
      "Calculates the modulus of a complex number.",

    variables: [
      { symbol: "a", meaning: "real part" },
      { symbol: "b", meaning: "imaginary part" },
    ],

    example:
      "Find modulus of 3+4i",
  },

  {
    id: 348,
    title: "De Moivre's Theorem",
    subject: "Mathematics",
    category: "Complex Numbers",
    level: "University",

    formula:
      "(\\cos\\theta+i\\sin\\theta)^n = \\cos n\\theta+i\\sin n\\theta",

    explanation:
      "Raises complex numbers in polar form to a power.",

    variables: [
      { symbol: "\\theta", meaning: "angle" },
      { symbol: "n", meaning: "power" },
      { symbol: "i", meaning: "imaginary unit" },
    ],

    example:
      "Find (1+i)^4 using De Moivre's theorem",
  },

  {
    id: 349,
    title: "Laplace Transform Definition",
    subject: "Engineering Mathematics",
    category: "Transforms",
    level: "University",

    formula:
      "\\mathcal{L}\\{f(t)\\}=\\int_0^\\infty e^{-st}f(t)dt",

    explanation:
      "Transforms time-domain functions into frequency-domain.",

    variables: [
      { symbol: "f(t)", meaning: "time-domain function" },
      { symbol: "s", meaning: "complex frequency" },
    ],

    example:
      "Find Laplace transform of f(t)=1",
  },

  {
    id: 350,
    title: "Inverse Laplace Transform",
    subject: "Engineering Mathematics",
    category: "Transforms",
    level: "University",

    formula:
      "\\mathcal{L}^{-1}\\{F(s)\\}=f(t)",

    explanation:
      "Converts frequency-domain functions back to time-domain.",

    variables: [
      { symbol: "F(s)", meaning: "frequency-domain function" },
      { symbol: "f(t)", meaning: "time-domain function" },
    ],

    example:
      "Find inverse Laplace transform of 1/s",
  },

  {
    id: 351,
    title: "Polar Form of Complex Number",
    subject: "Mathematics",
    category: "Complex Numbers",
    level: "University",

    formula:
      "z = r(\\cos\\theta + i\\sin\\theta)",

    explanation:
      "Represents a complex number in polar form.",

    variables: [
      { symbol: "r", meaning: "modulus" },
      { symbol: "\\theta", meaning: "argument" },
      { symbol: "i", meaning: "imaginary unit" },
    ],

    example:
      "Convert 1+i into polar form",
  },

  {
    id: 352,
    title: "Frequency Formula",
    subject: "Physics",
    category: "Waves",
    level: "Foundation",

    formula:
      "f = \\frac{1}{T}",

    explanation:
      "Calculates frequency from the period of a wave.",

    variables: [
      { symbol: "f", meaning: "frequency" },
      { symbol: "T", meaning: "period" },
    ],

    example:
      "Find frequency when period is 0.5s",
  },

  {
    id: 353,
    title: "Period of a Pendulum",
    subject: "Physics",
    category: "Mechanics",
    level: "Foundation",

    formula:
      "T = 2\\pi\\sqrt{\\frac{l}{g}}",

    explanation:
      "Calculates the period of a simple pendulum.",

    variables: [
      { symbol: "T", meaning: "period" },
      { symbol: "l", meaning: "length" },
      { symbol: "g", meaning: "acceleration due to gravity" },
    ],

    example:
      "Find period of pendulum with l=1m",
  },

  {
    id: 354,
    title: "Angular Velocity",
    subject: "Physics",
    category: "Rotational Motion",
    level: "Foundation",

    formula:
      "\\omega = \\frac{\\theta}{t}",

    explanation:
      "Calculates angular velocity from angle and time.",

    variables: [
      { symbol: "\\omega", meaning: "angular velocity" },
      { symbol: "\\theta", meaning: "angle" },
      { symbol: "t", meaning: "time" },
    ],

    example:
      "Find angular velocity when θ=2π and t=1s",
  },

  {
    id: 355,
    title: "Centripetal Force",
    subject: "Physics",
    category: "Circular Motion",
    level: "Foundation",

    formula:
      "F = \\frac{mv^2}{r}",

    explanation:
      "Calculates the force keeping an object in circular motion.",

    variables: [
      { symbol: "F", meaning: "centripetal force" },
      { symbol: "m", meaning: "mass" },
      { symbol: "v", meaning: "velocity" },
      { symbol: "r", meaning: "radius" },
    ],

    example:
      "Find centripetal force for m=2kg, v=3m/s, r=1m",
  },

  {
    id: 356,
    title: "Magnetic Force on a Conductor",
    subject: "Physics",
    category: "Magnetism",
    level: "University",

    formula:
      "F = BIL\\sin\\theta",

    explanation:
      "Calculates the force on a current-carrying conductor in a magnetic field.",

    variables: [
      { symbol: "F", meaning: "magnetic force" },
      { symbol: "B", meaning: "magnetic field strength" },
      { symbol: "I", meaning: "current" },
      { symbol: "L", meaning: "length of conductor" },
      { symbol: "\\theta", meaning: "angle between field and current" },
    ],

    example:
      "Find force on conductor in magnetic field",
  },

  {
    id: 357,
    title: "Transformer Equation",
    subject: "Physics",
    category: "Electromagnetism",
    level: "Foundation",

    formula:
      "\\frac{V_p}{V_s} = \\frac{N_p}{N_s}",

    explanation:
      "Relates voltage and number of turns in a transformer.",

    variables: [
      { symbol: "V_p", meaning: "primary voltage" },
      { symbol: "V_s", meaning: "secondary voltage" },
      { symbol: "N_p", meaning: "primary turns" },
      { symbol: "N_s", meaning: "secondary turns" },
    ],

    example:
      "Find secondary voltage of transformer",
  },

  {
    id: 358,
    title: "Snell's Law",
    subject: "Physics",
    category: "Optics",
    level: "Foundation",

    formula:
      "n_1\\sin\\theta_1 = n_2\\sin\\theta_2",

    explanation:
      "Relates angles of incidence and refraction in different media.",

    variables: [
      { symbol: "n_1", meaning: "refractive index of first medium" },
      { symbol: "n_2", meaning: "refractive index of second medium" },
      { symbol: "\\theta_1", meaning: "angle of incidence" },
      { symbol: "\\theta_2", meaning: "angle of refraction" },
    ],

    example:
      "Find angle of refraction when light enters glass",
  },

  {
    id: 359,
    title: "Lens Formula",
    subject: "Physics",
    category: "Optics",
    level: "Foundation",

    formula:
      "\\frac{1}{f} = \\frac{1}{u} + \\frac{1}{v}",

    explanation:
      "Relates focal length, object distance, and image distance for a lens.",

    variables: [
      { symbol: "f", meaning: "focal length" },
      { symbol: "u", meaning: "object distance" },
      { symbol: "v", meaning: "image distance" },
    ],

    example:
      "Find focal length when u=20cm and v=30cm",
  },

  {
    id: 360,
    title: "Efficiency Formula",
    subject: "Physics",
    category: "Energy",
    level: "Foundation",

    formula:
      "\\eta = \\frac{\\text{Useful Output}}{\\text{Input}} \\times 100",

    explanation:
      "Calculates the efficiency of a machine or process.",

    variables: [
      { symbol: "\\eta", meaning: "efficiency" },
      { symbol: "Useful Output", meaning: "useful energy or work" },
      { symbol: "Input", meaning: "total energy input" },
    ],

    example:
      "Find efficiency of a machine",
  },
];
