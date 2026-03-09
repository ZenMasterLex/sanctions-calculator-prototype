/**
 * Explicit Normalized Data for Article 217
 * 
 * Extracted directly from: AUTOMATIC SANCTION CALCULATOR.xlsx - Sheet1__.csv
 * Hardened for the prototype sendable state.
 */

export const ARTICLE_217_DATA = {
  articleName: 'Čl. 217 KZ BiH, "Primanje poklona i drugih oblika koristi"',
  subArticles: [
    {
      label: 'Stav 1',
      min: 1,
      max: 10,
      factors: {
        classification: {
          'Osnovni': 0.07,
          'Srednji': 0.07,
          'Visoki': 0.07
        },
        guilt: {
          'Direktni umišljaj': 0.07,
          'Indirektni umišljaj': 0.07,
          'Svjesni nehat': 0.07,
          'Nesvjesni nehat': 0.07
        },
        consequence: {
          'Povreda': 0.07,
          'Ugrožavanje': 0.07,
          'Izuzetno': 0.05,
          'Srednje': 0.05,
          'Nisko': 0.07
        },
        execution: {
          'Osnovni': 0.05,
          'Kvalifikacioni': 0.05,
          'Sticaj': 0.05,
          'Produženo djelo': 0.05
        }
      }
    },
    {
      label: 'Stav 2',
      min: 0.5,
      max: 5,
      factors: {
        classification: {
          'Osnovni': 0.07,
          'Srednji': 0.07,
          'Visoki': 0.07
        },
        guilt: {
          'Direktni umišljaj': 0.07,
          'Indirektni umišljaj': 0.07,
          'Svjesni nehat': 0.07,
          'Nesvjesni nehat': 0.07
        },
        consequence: {
          'Povreda': 0.07,
          'Ugrožavanje': 0.07,
          'Izuzetno': 0.05,
          'Srednje': 0.05,
          'Nisko': 0.07
        },
        execution: {
          'Osnovni': 0.05,
          'Kvalifikacioni': 0.05,
          'Sticaj': 0.05,
          'Produženo djelo': 0.05
        }
      }
    }
  ]
};
