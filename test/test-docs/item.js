// MARC records from https://www.loc.gov/marc/bibliographic/examples.html
// NOTE: the length fields in the leader are *wildly* inaccurate
// NOTE: there are no checkoutID fields in the examples
module.exports = {
  simple1: {
    marc: {
      leader: '05463nam  2200075 a 4500',
      fields: {
        control: [{
          tag: 1,
          value: '89187647889'
        }, {
          tag: 3,
          value: '87164'
        }, {
          tag: 5,
          value: '19920331092212.7'
        }, {
          tag: 7,
          value: 'ta'
        }, {
          tag: 8,
          value: '820305s1991    nyu           001 0 eng  '
        }],
        variable: [{
          tag: 20,
          ind1: ' ',
          ind2: ' ',
          subfields: [{
            tag: 'a',
            value: '0845348116'
          }, {
            tag: 'c',
            value: '$29.95 (£19.50 U.K.)'
          }]
        }, {
          tag: 20,
          ind1: ' ',
          ind2: ' ',
          subfields: [{
            tag: 'a',
            value: '0845348205 (pbk.)'
          }]
        }, {
          tag: 40,
          ind1: ' ',
          ind2: ' ',
          subfields: [{
            tag: 'a',
            value: 'EkG'
          }, {
            tag: 'c',
            value: 'OacTY'
          }]
        }, {
          tag: 50,
          ind1: '1',
          ind2: '4',
          subfields: [{
            tag: 'a',
            value: 'PN1992.8.S4'
          }, {
            tag: 'b',
            value: 'T47 1991'
          }]
        }, {
          tag: 82,
          ind1: '0',
          ind2: '4',
          subfields: [{
            tag: 'a',
            value: '791.45/75/0973'
          }, {
            tag: '2',
            value: '219'
          }]
        }, {
          tag: 100,
          ind1: '1',
          ind2: ' ',
          subfields: [{
            tag: 'a',
            value: 'Terrace, Vincent'
          }, {
            tag: 'd',
            value: '1948-'
          }]
        }, {
          tag: 245,
          ind1: '1',
          ind2: '0',
          subfields: [{
            tag: 'a',
            value: 'Fifty years of television'
          }, {
            tag: 'b',
            value: 'a guide to series and pilots, 1937-1988'
          }, {
            tag: 'c',
            value: 'Vincent Terrace'
          }]
        }, {
          tag: 246,
          ind1: '1',
          ind2: ' ',
          subfields: [{
            tag: 'a',
            value: '50 years of television'
          }]
        }, {
          tag: 260,
          ind1: ' ',
          ind2: ' ',
          subfields: [{
            tag: 'a',
            value: 'New York'
          }, {
            tag: 'b',
            value: 'Cornwall Books'
          }, {
            tag: 'c',
            value: 'c1991'
          }]
        }, {
          tag: 300,
          ind1: ' ',
          ind2: ' ',
          subfields: [{
            tag: 'a',
            value: '864 p.'
          }, {
            tag: 'c',
            value: '24 cm'
          }]
        }, {
          tag: 500,
          ind1: ' ',
          ind2: ' ',
          subfields: [{
            tag: 'a',
            value: 'Includes index'
          }]
        }, {
          tag: 650,
          ind1: ' ',
          ind2: '0',
          subfields: [{
            tag: 'a',
            value: 'Television pilot programs'
          }, {
            tag: 'z',
            value: 'United States'
          }, {
            tag: 'v',
            value: 'Catalogs'
          }]
        }, {
          tag: 650,
          ind1: ' ',
          ind2: '0',
          subfields: [{
            tag: 'a',
            value: 'Television serials'
          }, {
            tag: 'z',
            value: 'United States'
          }, {
            tag: 'v',
            value: 'Catalogs'
          }]
        }]
      }
    },
    barcode: 45871389531,
    status: 'in'
  },
  simple2: {
    marc: {
      leader: '09348cas  2200053 a 4500',
      fields: {
        control: [{
          tag: 1,
          value: '218974634621'
        }, {
          tag: 3,
          value: '1893'
        }, {
          tag: 5,
          value: '19920716101553.0'
        }, {
          tag: 8,
          value: '791031c19789999dcuar1        0   a0eng d'
        }],
        variable: [{
          tag: 10,
          ind1: ' ',
          ind2: ' ',
          subfields: [{
            tag: 'a',
            value: '   85649389 '
          }, {
            tag: 'z',
            value: 'sc 80000109 '
          }]
        }, {
          tag: 22,
          ind1: '0',
          ind2: ' ',
          subfields: [{
            tag: 'a',
            value: '0273-1967'
          }]
        }, {
          tag: 35,
          ind1: ' ',
          ind2: ' ',
          subfields: [{
            tag: 'a',
            value: '(OCoLC)5629434'
          }]
        }, {
          tag: 40,
          ind1: ' ',
          ind2: ' ',
          subfields: [{
            tag: 'a',
            value: 'OeAA'
          }, {
            tag: 'c',
            value: 'EErsdK'
          }, {
            tag: 'd',
            value: 'JJE'
          }]
        }, {
          tag: 42,
          ind1: ' ',
          ind2: ' ',
          subfields: [{
            tag: 'a',
            value: 'lc'
          }, {
            tag: 'a',
            value: 'nsdp'
          }]
        }, {
          tag: 43,
          ind1: ' ',
          ind2: ' ',
          subfields: [{
            tag: 'a',
            value: 'n-us---'
          }]
        }, {
          tag: 50,
          ind1: '0',
          ind2: '0',
          subfields: [{
            tag: 'a',
            value: 'SK361'
          }, {
            tag: 'b',
            value: '.U63a'
          }]
        }, {
          tag: 82,
          ind1: '0',
          ind2: '0',
          subfields: [{
            tag: 'a',
            value: '639.9/2/0973'
          }, {
            tag: '2',
            value: '19'
          }]
        }, {
          tag: 210,
          ind1: '0',
          ind2: ' ',
          subfields: [{
            tag: 'a',
            value: 'Annu. wildl. fish. rep.'
          }]
        }, {
          tag: 222,
          ind1: ' ',
          ind2: '0',
          subfields: [{
            tag: 'a',
            value: 'Annual wildlife and fisheries report'
          }]
        }, {
          tag: 245,
          ind1: '0',
          ind2: '0',
          subfields: [{
            tag: 'a',
            value: 'Annual wildlife and fisheries report'
          }, {
            tag: 'c',
            value: 'United States Department of Agriculture, Forest Service, ' +
              'Wildlife and Fisheries'
          }]
        }, {
          tag: 246,
          ind1: '1',
          ind2: '4',
          subfields: [{
            tag: 'a',
            value: 'Wildlife and fish habitat management in the Forest Service'
          }]
        }, {
          tag: 260,
          ind1: ' ',
          ind2: ' ',
          subfields: [{
            tag: 'a',
            value: '[Washington, D.C.]'
          }, {
            tag: 'b',
            value: 'Wildlife and Fisheries'
          }]
        }, {
          tag: 300,
          ind1: ' ',
          ind2: ' ',
          subfields: [{
            tag: 'a',
            value: 'v.'
          }, {
            tag: 'b',
            value: 'ill.'
          }, {
            tag: 'c',
            value: '28 cm'
          }]
        }, {
          tag: 310,
          ind1: ' ',
          ind2: ' ',
          subfields: [{
            tag: 'a',
            value: 'Annual'
          }]
        }, {
          tag: 362,
          ind1: '1',
          ind2: ' ',
          subfields: [{
            tag: 'a',
            value: 'Began with vol. for 1978'
          }]
        }, {
          tag: 500,
          ind1: ' ',
          ind2: ' ',
          subfields: [{
            tag: 'a',
            value: 'Description based on: 1983'
          }]
        }, {
          tag: 650,
          ind1: ' ',
          ind2: '0',
          subfields: [{
            tag: 'a',
            value: 'Wildlife management'
          }, {
            tag: 'z',
            value: 'United States'
          }, {
            tag: 'v',
            value: 'Statistics'
          }, {
            tag: 'v',
            value: 'Periodicals'
          }]
        }, {
          tag: 650,
          ind1: ' ',
          ind2: '0',
          subfields: [{
            tag: 'a',
            value: 'Wildlife management'
          }, {
            tag: 'z',
            value: 'United States'
          }, {
            tag: 'v',
            value: 'Periodicals'
          }]
        }, {
          tag: 650,
          ind1: ' ',
          ind2: '0',
          subfields: [{
            tag: 'a',
            value: 'Wildlife habitat improvement'
          }, {
            tag: 'z',
            value: 'United States'
          }, {
            tag: 'v',
            value: 'Statistics'
          }, {
            tag: 'v',
            value: 'Periodicals'
          }]
        }, {
          tag: 650,
          ind1: ' ',
          ind2: '0',
          subfields: [{
            tag: 'a',
            value: 'Wildlife habitat improvement'
          }, {
            tag: 'z',
            value: 'United States'
          }, {
            tag: 'v',
            value: 'Periodicals'
          }]
        }, {
          tag: 710,
          ind1: '1',
          ind2: ' ',
          subfields: [{
            tag: 'a',
            value: 'United States'
          }, {
            tag: 'b',
            value: 'Forest Service'
          }, {
            tag: 'b',
            value: 'Wildlife and Fisheries Staff'
          }]
        }, {
          tag: 780,
          ind1: '0',
          ind2: '0',
          subfields: [{
            tag: 'a',
            value: 'United States. Forest Service. Division of Wildlife ' +
              'Management.'
          }, {
            tag: 't',
            value: 'Annual wildlife report'
          }, {
            tag: 'x',
            value: '0099-068X'
          }, {
            tag: 'w',
            value: '(OCoLC)224070'
          }, {
            tag: 'w',
            value: '(DLC)   75644790'
          }]
        }, {
          tag: 850,
          ind1: ' ',
          ind2: ' ',
          subfields: [{
            tag: 'a',
            value: 'OeAA'
          }, {
            tag: 'a',
            value: 'EErsdK'
          }, {
            tag: 'a',
            value: 'JJE'
          }]
        }]
      }
    },
    barcode: 8913876178,
    status: 'out'
  },
  unicode: { // ZALGO, HE COMES
    marc: {
      leader: '76756cmm  2289781 a 4500',
      fields: {
        control: [{
          tag: 1,
          value: '9876548765'
        }, {
          tag: 3,
          value: '25314'
        }, {
          tag: 5,
          value: '19920401095900.0'
        }, {
          tag: 8,
          value: '870206s1985    miu        da       eng  '
        }],
        variable: [{
          tag: 40,
          ind1: ' ',
          ind2: ' ',
          subfields: [{
            tag: 'a',
            value: 'ÐlàD'
          }, {
            tag: 'c',
            value: 'ÛøK'
          }]
        }, {
          tag: 100,
          ind1: '1',
          ind2: ' ',
          subfields: [{
            tag: 'a',
            value: 'Àßhw♫éłł, ^J"øñät*h♫an Ð.'
          }]
        }, {
          tag: 245,
          ind1: '1',
          ind2: '0',
          subfields: [{
            tag: 'a',
            value: 'Bøøk♫énds| ëxtènðË♫ð'
          }, {
            tag: 'h',
            value: '[élè¢troñí© r&éßoûrçe♫]'
          }, {
            tag: 'b',
            value: 'thê réfëreñ¢e "m"áñägèmëñt♫ sÿßtëm'
          }]
        }, {
          tag: 250,
          ind1: ' ',
          ind2: ' ',
          subfields: [{
            tag: 'a',
            value: 'V2.08'
          }]
        }, {
          tag: 260,
          ind1: ' ',
          ind2: ' ',
          subfields: [{
            tag: 'a',
            value: 'Birmïñghàm, Mìçh.'
          }, {
            tag: 'b',
            value: '§éñßîblë Sõftwärè♫'
          }, {
            tag: 'c',
            value: 'c1985'
          }]
        }, {
          tag: 300,
          ind1: ' ',
          ind2: ' ',
          subfields: [{
            tag: 'a',
            value: '2 %cømþutêr ðî§kß ❤'
          }, {
            tag: 'c',
            value: '3 1/2-5 1/4 in.'
          }, {
            tag: 'e',
            value: '1 màñüäl♫ (107 p. ; 23 cm)'
          }]
        }, {
          tag: 500,
          ind1: ' ',
          ind2: ' ',
          subfields: [{
            tag: 'a',
            value: '©oÞýrïght \'âñð\' m@ñúäl ßÿ JøÑÂthàñ Ð.📨Á§hwèłł'
          }]
        }, {
          tag: 500,
          ind1: ' ',
          ind2: ' ',
          subfields: [{
            tag: 'a',
            value: 'Çøñtënts✓ ☢f ðíßks ärê *"*iðénþíçàl✓✓✓'
          }]
        }, {
          tag: 520,
          ind1: ' ',
          ind2: ' ',
          subfields: [{
            tag: 'a',
            value: 'ÐèsïgñÊÐ tô♫sàvë, rëtrìévë, âñð✓f☢rmât rëférèñçés, âñd tø '
                 + 'Þríñt ßìßl♫ï0gràþ╫ìêß ❤❤❤'
          }]
        }, {
          tag: 538,
          ind1: ' ',
          ind2: ' ',
          subfields: [{
            tag: 'a',
            value: '§ÿstém rêqúïrèmêñ𝔱ß⠃ ÀÞÞlè ÎÍë wíth 80♫ ©ølúmn ¢ârð ør '
                 + 'Äþþlè ÏÌç;128K⍮ ÞróÐØS❣; þríñ𝔱ër ♫♫♫ ❄❄❄❄❄❄❄❄❄'
          }]
        }, {
          tag: 710,
          ind1: '2',
          ind2: ' ',
          subfields: [{
            tag: 'a',
            value: '§ëƪñs╫ß⟅è Söf𝔱wàré⟅⟅⟅Ïñ©. ♫'
          }]
        }, {
          tag: 753,
          ind1: ' ',
          ind2: ' ',
          subfields: [{
            tag: 'a',
            value: 'Áþþlé ÎÍë 📨📨📨📨📨'
          }]
        }, {
          tag: 753,
          ind1: ' ',
          ind2: ' ',
          subfields: [{
            tag: 'a',
            value: 'àÞÞlË iï¢ ❔❔❔'
          }]
        }]
      }
    },
    barcode: 983763193413,
    status: 'missing'
  },
  whitespace: {
    marc: {
      leader: '98724caa  2288888 a 4500',
      fields: {
        control: [{
          tag: 1,
          value: '45678987654'
        }, {
          tag: 3,
          value: '918'
        }, {
          tag: 5,
          value: '19920504100110.5'
        }, {
          tag: 8,
          value: '860504s1977    mnua          000 0 eng d'
        }],
        variable: [{
          tag: 40,
          ind1: ' ',
          ind2: ' ',
          subfields: [{
            tag: 'a',
            value: '    \t\t  \r\f\v  '
          }, {
            tag: 'c',
            value: '\t\t                '
          }]
        }, {
          tag: 43,
          ind1: ' ',
          ind2: ' ',
          subfields: [{
            tag: 'a',
            value: 'n-us---'
          }]
        }, {
          tag: 100,
          ind1: '1',
          ind2: ' ',
          subfields: [{
            tag: 'a',
            value: '  \f\f\t\t      '
          }, {
            tag: 'q',
            value: '             \t     '
          }, {
            tag: 'd',
            value: '1945-'
          }]
        }, {
          tag: 245,
          ind1: '1',
          ind2: '0',
          subfields: [{
            tag: 'a',
            value: '\t\t       \f\v\v    '
          }, {
            tag: 'c',
            value: '  \t   \v\v  \f \t \r \r   '
          }]
        }, {
          tag: 300,
          ind1: ' ',
          ind2: ' ',
          subfields: [{
            tag: 'a',
            value: 'p. 24-34, 36-37, 40-41'
          }, {
            tag: 'b',
            value: 'ill.'
          }, {
            tag: 'c',
            value: '29 cm'
          }]
        }, {
          tag: 500,
          ind1: ' ',
          ind2: ' ',
          subfields: [{
            tag: 'a',
            value: '  \r\r   '
          }]
        }, {
          tag: 773,
          ind1: '0',
          ind2: ' ',
          subfields: [{
            tag: '7',
            value: 'nnas'
          }, {
            tag: 't',
            value: '\f'
          }, {
            tag: 'g',
            value: 'v. 4, no. 4 (July-Aug. 1977)'
          }, {
            tag: 'w',
            value: '(OCoLC)2253666'
          }]
        }]
      }
    },
    barcode: 876545678,
    status: 'in'
  }
};